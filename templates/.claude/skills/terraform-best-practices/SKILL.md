---
name: terraform-best-practices
description: "Terraform/AWS workflow rules: never auto-apply, always confirm before high-cost resources (Private CA ~$400, NAT GW, Aurora, KMS…), plan summary with add/change/destroy + drift, reusable module layout (env/<env>/<service>.tf + modules/<svc>/<component>.tf, network module groups VPC/SG/SGR/NAT), lifecycle prevent_destroy on stateful resources (Aurora, S3, KMS, SSM), no plaintext secrets (random_password + SSM SecureString), least-privilege IAM, SGR must justify who/from/to/protocol/why, naming {env}-{service}-{purpose}[-{version}], common tags via default_tags, minimal outputs. Triggers on .tf edits and on user saying 'check' / 'plan' / 'validate'."
license: MIT
metadata:
  author: HoangThang
  version: '1.0.0'
---

# Terraform Best Practices

Team rules for Terraform on AWS. Read these before editing any `.tf` file.

## When to trigger

- Editing any `.tf` / `.tfvars` file
- User says **"check"**, **"plan"**, **"validate"**, **"fmt"**
- Creating or modifying infrastructure
- Reviewing drift, cost, or security of cloud resources

## CRITICAL — never apply

**Do NOT run `terraform apply`. Do NOT suggest the user run it.** Apply is always the user's decision, on the user's machine, with their credentials. Agent only edits files and runs read-only commands (`fmt`, `validate`, `plan`, `show`, `state list`, `output`).

If user explicitly types "apply" / "run apply" → still pause and ask once to confirm, then let them run it themselves unless they insist.

## High-cost resources — confirm before writing

Stop and ask the user before creating any of these. Quote the rough monthly cost so they can decide:

| Resource | Rough cost | Why expensive |
|---|---|---|
| `aws_acmpca_certificate_authority` | ~$400/mo per CA | flat monthly fee |
| `aws_nat_gateway` | ~$35/mo + data | per AZ, per GB |
| `aws_transit_gateway` | ~$36/mo + attach + data | per attachment too |
| `aws_rds_cluster` (Aurora) | varies, often >$100/mo | per ACU/hour |
| `aws_elasticache_*` | varies | per node-hour |
| `aws_opensearch_domain` | varies | per node-hour + storage |
| `aws_vpc_endpoint` (Interface) | ~$7/mo per endpoint per AZ | per ENI-hour |
| `aws_kms_key` (customer-managed) | $1/mo + req | adds up across services |
| `aws_eks_cluster` | $73/mo control plane | + node costs |
| `aws_msk_cluster` | varies, often >$200/mo | per broker-hour |
| `aws_directconnect_*` | $$$ | port + data |
| `aws_globalaccelerator_*` | ~$18/mo + data | flat + traffic |

Pattern: list what will be created → estimated monthly cost → wait for explicit OK. Don't write the `.tf` until confirmed.

## The "check" command

When user says **"check"**, run sequentially and report:

1. `terraform fmt -recursive` — fix formatting, list any files changed
2. `terraform validate` — surface syntax/type errors
3. `terraform plan -no-color` — capture the plan

Then summarize the plan in this format:

```
PLAN SUMMARY

ADD     (N): <type.name> × N   — list types
CHANGE  (N): <type.name>       — flag any in-place change that recreates / drops data
DESTROY (N): <type.name>       — flag DANGER for aurora, s3, kms, ssm, dynamodb
DRIFT   (N): <type.name>       — suggest fix (terraform import / update .tf / ignore_changes)

NOTES:
- High-cost adds (if any)
- Destructive actions on stateful resources
- Resources missing prevent_destroy that should have it
- IAM widening (Resource = "*", new wildcard actions)
- New SGR without description or with 0.0.0.0/0 ingress
```

Keep it under 30 lines. Link to the full plan output if user wants more.

## Project layout — reusable modules

```
infra/
  env/
    dev/
      providers.tf          # provider + default_tags
      backend.tf            # remote state config
      variables.tf
      terraform.tfvars
      network.tf            # calls modules/network
      ec2.tf                # calls modules/ec2 (one file per service)
      rds.tf
      s3.tf
      kms.tf
      iam.tf                # env-level roles only
    staging/
    prod/
  modules/
    network/                # VPC + subnets + SG + SGR + NAT + route tables
      vpc.tf
      subnets.tf
      sg.tf
      sgr.tf
      nat.tf
      route_tables.tf
      variables.tf
      outputs.tf
    ec2/                    # module groups everything the EC2 service needs
      main.tf               # instance / launch template / ASG
      iam.tf                # instance profile + role + policy
      sg.tf                 # service-specific SG
      s3.tf                 # (optional) bucket the app reads/writes
      ssm.tf                # (optional) params the app loads at boot
      kms.tf                # (optional) key used to encrypt its own data
      variables.tf
      outputs.tf
    rds/
    network/
```

Rules — guidelines, not laws:

- **One `.tf` per service** at the env level (`ec2.tf`, `rds.tf`, …). Easier to grep, easier to PR.
- **Inside a module, split files by component**, not by AWS service category. The point is readability — keep each file focused on one concern of the module.
- **A module owns the resources its task needs.** If the `ec2` module's app reads from an S3 bucket and loads SSM params, that bucket and those params live **inside** `modules/ec2/` (`s3.tf`, `ssm.tf`). Don't force them out into a separate `modules/s3/` just because they're S3 — separation by AWS service is artificial.
- **When to extract a separate module instead:** the resource is genuinely shared by 2+ unrelated callers, has its own lifecycle, or belongs to a different team's domain. Otherwise keep it co-located with the consumer.
- **Network module aggregates** VPC, subnets, SG, SGR, NAT, route tables — because everyone consumes its outputs. Other modules call into it for `vpc_id`, `subnet_ids`, base `sg_ids`.
- Module must be **env-agnostic** — env-specific values come in as variables.
- No `count` / `for_each` gymnastics in the env layer when a separate file would be clearer.

Heuristic for "module or env file?": if the resource is only meaningful **with** the service (its IAM role, its bucket, its SSM param), put it in the module. If it's a foundational layer that many services share (VPC, central KMS key, shared S3 data lake), put it in its own module or at the env layer.

## Lifecycle — prevent destroy on stateful

Always add to data-bearing or hard-to-recreate resources:

```hcl
lifecycle {
  prevent_destroy = true
}
```

Required on:
- `aws_rds_cluster`, `aws_db_instance` (Aurora/RDS)
- `aws_s3_bucket`
- `aws_kms_key`, `aws_kms_alias`
- `aws_ssm_parameter` (SecureString)
- `aws_dynamodb_table` (if used as primary store)
- `aws_acmpca_certificate_authority`
- `aws_efs_file_system`, `aws_backup_vault`

For volatile attributes that change outside Terraform, also use `ignore_changes` (e.g. autoscaling-managed desired_capacity).

## Secrets — no plaintext, ever

❌ Never put real secrets in `.tf` or `.tfvars`. Never commit to git.

✅ Pattern: generate with `random_password`, store in SSM SecureString or Secrets Manager, reference via data source or attribute.

```hcl
resource "random_password" "rds_master" {
  length      = 32
  special     = true
  min_special = 4
}

resource "aws_ssm_parameter" "rds_master" {
  name   = "/${var.env}/rds/${var.service}/master-password"
  type   = "SecureString"
  key_id = aws_kms_key.ssm.arn
  value  = random_password.rds_master.result

  lifecycle { prevent_destroy = true }
}

resource "aws_rds_cluster" "main" {
  master_password = random_password.rds_master.result
  # ...
}
```

For rotation: prefer **Secrets Manager** with `rotation_lambda_arn`. For static lookups from existing secrets: `data "aws_ssm_parameter"` with `with_decryption = true`.

## IAM — least privilege

- Start with the **minimum action set**. When AccessDenied appears in logs, add the specific action.
- Prefer **explicit resource ARNs** over `Resource = "*"`. Wildcards only when AWS itself requires (e.g. some `iam:PassRole` cases).
- Prefer **AWS-managed policies** only for well-known service roles (`AmazonSSMManagedInstanceCore`, `AmazonEC2ContainerRegistryReadOnly`).
- Custom policies > inline policies (easier to reuse and review).
- Use **conditions** when scope can be tightened: `aws:SourceVpc`, `aws:SourceArn`, `StringEquals: aws:ResourceTag/...`.
- Separate **trust policy** from **permission policy** clearly.

## Security group rules — must justify

Every `aws_security_group_rule` (or inline `ingress`/`egress`) must have a `description` answering all 5:

1. **Who** calls (source service/team)
2. **From where** (CIDR or source sg)
3. **To what port** / port range
4. **Protocol** (tcp/udp/icmp)
5. **Why** it's needed

```hcl
resource "aws_security_group_rule" "api_to_rds" {
  type                     = "ingress"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = module.network.sg_rds_id
  source_security_group_id = module.ec2_api.sg_id
  description              = "api service (api-sg) -> rds postgres on tcp/5432 — app reads/writes user data"
}
```

Red flags to call out in plan summary:
- `0.0.0.0/0` on ingress for anything non-80/443
- `protocol = "-1"` (all protocols) — only OK for egress in dev
- Missing description
- Source SG referenced by name not by `id` (creates ordering issues)

## Naming convention

Pattern: `{env}-{service}-{purpose}[-{version}]` — lowercase, dashes, no underscores in resource names.

Examples:
- `prod-api-asg-v2`
- `dev-rds-aurora-main`
- `staging-s3-userdata`
- `prod-kms-rds-master`
- `prod-iam-role-api-task`

Rules:
- `env` ∈ {`dev`, `staging`, `prod`} (or your team's set, but keep it closed)
- `service` ∈ {`api`, `web`, `worker`, `rds`, `s3`, `kms`, …}
- `purpose` = short tag (`asg`, `main`, `userdata`, `master`)
- `version` = optional, only when running multiple variants (blue/green, v1/v2)

For Terraform **resource block names** (the local identifier), use snake_case to match HCL convention — `aws_iam_role.api_task` — and put the dashed name in the `name`/`tags.Name` argument.

## Common tags

Set once via provider `default_tags`, inherited by every taggable resource:

```hcl
provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Environment = var.env          # dev / staging / prod
      Project     = var.project
      Owner       = var.team_email
      ManagedBy   = "terraform"
      CostCenter  = var.cost_center
      Repo        = var.repo_url
    }
  }
}
```

Per-resource tags only when adding something the default doesn't cover: `Component = "api"`, `BackupPolicy = "daily-30d"`, `DataClass = "pii"`.

Cost tags must be **stable** — don't change CostCenter mid-quarter; create a new one and migrate.

## Outputs — minimal

- Export only what other modules / env files actually consume.
- Don't re-export everything "just in case" — adds noise, slows refresh.
- Add `description` to every output.
- Mark secrets with `sensitive = true`.
- If a consumer needs something later, add it then — not preemptively.

```hcl
output "vpc_id" {
  description = "VPC ID for downstream modules"
  value       = aws_vpc.main.id
}

output "rds_endpoint" {
  description = "Aurora writer endpoint"
  value       = aws_rds_cluster.main.endpoint
  sensitive   = false
}
```

## Workflow

```
edit .tf
  ↓
user: "check"
  ↓
agent: fmt → validate → plan → SUMMARY (add/change/destroy/drift/dangers)
  ↓
user reviews
  ↓
user runs `terraform apply`   ← never the agent
```

If plan shows destroys on stateful resources or expensive new resources, agent **must** pause and re-confirm before user proceeds.

## Anti-patterns

- Running or suggesting `terraform apply`
- Plaintext password / API key in `.tf` or `.tfvars`
- `Resource = "*"` on IAM without justification
- `cidr_blocks = ["0.0.0.0/0"]` on private services
- SGR with no description, or description like `"allow"`
- One giant `main.tf` at env level — split per service
- Module that branches on `var.env` — push env-specific values up to the env layer
- Hardcoded account IDs / ARNs — use `data "aws_caller_identity"` / variables
- Creating expensive resource without quoting cost first
- Missing `prevent_destroy` on Aurora / S3 / KMS / SSM SecureString
- Outputting everything from a module
- Mixing snake_case and dashes inconsistently in `Name` tags

## Quick reference

```
Q: User says "check" — what do I run?
A: terraform fmt -recursive → terraform validate → terraform plan → summarize.

Q: Plan shows destroy of aws_s3_bucket — what do I do?
A: STOP. Flag in summary as DANGER. Confirm with user it's intentional. Suggest prevent_destroy if missing.

Q: User wants to add ACM Private CA?
A: Quote ~$400/mo, confirm before writing tf.

Q: Where does VPC live?
A: modules/network/vpc.tf — called from env/<env>/network.tf.

Q: Where do I put a new EC2 service?
A: env/<env>/<service>.tf calling modules/ec2/, with service-specific vars.

Q: My EC2 module's app needs an S3 bucket + a KMS key for its own data. Separate modules?
A: No — put s3.tf and kms.tf inside modules/ec2/. The bucket/key only exist to serve this service. Extract to its own module only when 2+ unrelated callers share it.

Q: New SGR, what fields?
A: type, from_port, to_port, protocol, sg id, source, AND description (who/from/to/proto/why).

Q: Storing a DB password?
A: random_password + aws_ssm_parameter SecureString with prevent_destroy.

Q: Should I run apply?
A: No. Never. User runs apply.
```
