---
name: react-page-oriented
description:
  React page-oriented folder architecture. Components live where they're used.
  Structure mirrors UI hierarchy. Use when creating pages, deciding file vs folder,
  organizing components, or setting up React/Next.js projects. Defines co-location
  rules for hooks, styles, tests.
license: MIT
metadata:
  author: HoangThang
  version: '2.0.0'
---

# React Page-Oriented Architecture

## Philosophy

**Components live where they're used. Structure mirrors UI hierarchy.**

- Child components belong IN their parent folder (not in a separate `components/` subfolder)
- Shared components are organized by LEVEL (page-level vs app-level)
- No premature abstraction - extract only when truly needed

> **Component Patterns:** This skill covers **folder/file organization only**.
> For component composition patterns (compound components, context, state management),
> follow the **vercel-composition-patterns** skill.

---

## Core Rules

### Rule 1: Page as Root

Every feature starts with a Page component as the root.

```
src/pages/
├── ProductPage/
├── OrderPage/
├── CustomerPage/
└── DashboardPage/
```

### Rule 2: Children Live IN Parent Folder

**Child components go DIRECTLY in parent folder** - NOT in a `components/` subfolder.

```
❌ DON'T: Separate components folder
ChatFrame/
├── ChatFrame.tsx
├── components/           # ❌ No! Don't create this
│   ├── ChatInput.tsx
│   └── ChatMessages.tsx
└── context/              # ❌ No! Don't create this
    └── ChatContext.tsx

✅ DO: Children directly in parent
ChatFrame/
├── ChatFrame.tsx         # Parent component
├── ChatFrame.css         # Parent styles
├── ChatContext.tsx       # Context for this component
├── ChatInput.tsx         # Child component
├── ChatMessages.tsx      # Child component
└── useChatFrame.ts       # Hook for this component
```

### Rule 3: File vs Folder Decision

**File (`.tsx`)** - Component has NO children or related files

```
StatusBadge.tsx       ✅ Simple, no children
LoadingSpinner.tsx    ✅ Static UI
```

**Folder** - Component HAS children OR related files (css, hook, context)

```
ChatFrame/            ✅ Has children (ChatInput, ChatMessages)
├── ChatFrame.tsx
├── ChatFrame.css
├── ChatInput.tsx
└── ChatMessages.tsx

Avatar/               ✅ Has related files (css)
├── Avatar.tsx
└── Avatar.css
```

### Rule 4: Shared Components by Level

Components shared within a scope stay at that scope's root:

| Scope | Location | Example |
|-------|----------|---------|
| Used by 1 component | Inside that component's folder | `ChatFrame/ChatInput.tsx` |
| Used by siblings in same page | Page folder root | `ProductPage/StatusBadge.tsx` |
| Used across multiple pages | `src/components/` | `components/Button.tsx` |
| Used app-wide (layout) | `src/layouts/` | `layouts/Sidebar.tsx` |

**Example - Page-level shared component:**

```
ProductPage/
├── ProductPage.tsx
├── StatusBadge.tsx       # ✅ Shared by ProductList AND ProductDetail
├── ProductList/
│   ├── ProductList.tsx   # Uses StatusBadge
│   └── ProductRow.tsx
└── ProductDetail/
    └── ProductDetail.tsx # Also uses StatusBadge
```

### Rule 5: No index.tsx for Re-export

❌ **Never do this:**
```
ProductList/
├── index.tsx         # export { ProductList } from './ProductList'
└── ProductList.tsx
```

✅ **Always import directly:**
```tsx
import { ProductList } from './ProductList/ProductList'
import { Button } from '@/components/Button'
```

### Rule 6: Maximum Nesting Depth = 4

```
pages/ProductPage/ProductList/ProductRow/RowActions.tsx
│     │            │           │          └── Level 4 (MAX)
│     │            │           └── Level 3
│     │            └── Level 2
│     └── Level 1
└── Root
```

If deeper → Flatten or move to `components/`

---

## Detailed Structure Example

```
src/
├── pages/
│   ├── ChatPage/
│   │   ├── ChatPage.tsx              # Page entry
│   │   ├── ChatPage.css
│   │   │
│   │   ├── ChatFrame/                # Main chat UI
│   │   │   ├── ChatFrame.tsx         # Parent component
│   │   │   ├── ChatFrame.css
│   │   │   ├── ChatContext.tsx       # Context lives WITH provider
│   │   │   ├── useChatFrame.ts       # Hook lives WITH component
│   │   │   ├── ChatHeader.tsx        # Child - simple file
│   │   │   ├── ChatInput.tsx         # Child - simple file
│   │   │   ├── ChatMessages/         # Child - has own children
│   │   │   │   ├── ChatMessages.tsx
│   │   │   │   ├── ChatMessages.css
│   │   │   │   ├── MessageItem.tsx   # Grandchild
│   │   │   │   └── TypingIndicator.tsx
│   │   │   └── ChatError.tsx         # Child - simple file
│   │   │
│   │   └── SessionList/              # Sidebar component
│   │       ├── SessionList.tsx
│   │       ├── SessionItem.tsx
│   │       └── useSessionList.ts
│   │
│   ├── ProductPage/
│   │   ├── ProductPage.tsx
│   │   ├── StatusBadge.tsx           # ✅ Shared within this page only
│   │   │
│   │   ├── ProductList/
│   │   │   ├── ProductList.tsx
│   │   │   ├── ProductRow.tsx        # Uses parent's StatusBadge
│   │   │   └── useProductList.ts
│   │   │
│   │   └── ProductDetail/
│   │       ├── ProductDetail.tsx     # Uses parent's StatusBadge
│   │       ├── ProductGallery/
│   │       │   ├── ProductGallery.tsx
│   │       │   ├── Thumbnail.tsx
│   │       │   └── Lightbox.tsx
│   │       └── ProductReviews/
│   │           ├── ProductReviews.tsx
│   │           ├── ReviewItem.tsx
│   │           └── ReviewForm.tsx
│   │
│   └── OrderPage/
│       ├── OrderPage.tsx
│       └── OrderList/
│           ├── OrderList.tsx
│           └── OrderRow.tsx
│
├── components/                       # ✅ Cross-page shared ONLY
│   ├── Button.tsx                    # Simple - file
│   ├── Input.tsx
│   ├── Modal/                        # Has children - folder
│   │   ├── Modal.tsx
│   │   ├── Modal.css
│   │   ├── ModalHeader.tsx
│   │   ├── ModalBody.tsx
│   │   └── ModalFooter.tsx
│   ├── Avatar/
│   │   ├── Avatar.tsx
│   │   └── Avatar.css
│   └── MarkdownRenderer/
│       ├── MarkdownRenderer.tsx
│       └── MarkdownRenderer.css
│
├── layouts/
│   ├── MainLayout.tsx
│   ├── Sidebar.tsx
│   └── Header.tsx
│
├── hooks/                            # ✅ App-wide hooks ONLY
│   ├── useAuth.ts
│   └── useApi.ts
│
├── store/                            # State management
│   ├── chatStore.ts
│   └── sessionStore.ts
│
├── services/                         # API calls
│   └── AgentClient.ts
│
├── types/                            # Global types
│   ├── chat.types.ts
│   └── session.types.ts
│
└── App.tsx
```

---

## Co-location Patterns

### Everything Related Lives Together

```
ChatFrame/
├── ChatFrame.tsx           # Component
├── ChatFrame.css           # Styles
├── ChatFrame.test.tsx      # Tests
├── ChatFrame.types.ts      # Types (if complex)
├── ChatContext.tsx         # Context for this subtree
├── useChatFrame.ts         # Logic hook
├── ChatHeader.tsx          # Child component
├── ChatInput.tsx           # Child component
└── ChatMessages/           # Complex child → folder
    ├── ChatMessages.tsx
    └── MessageItem.tsx
```

### Context Lives with Provider

Context should be in the same folder as the component that provides it:

```
❌ DON'T:
src/
├── context/
│   └── ChatContext.tsx     # Far from provider
└── pages/ChatPage/ChatFrame/ChatFrame.tsx

✅ DO:
src/pages/ChatPage/
└── ChatFrame/
    ├── ChatFrame.tsx       # Provides context
    └── ChatContext.tsx     # Lives here
```

### Hooks Live with Components

```
❌ DON'T:
src/
├── hooks/
│   └── useChatFrame.ts     # Only used by ChatFrame
└── pages/ChatPage/ChatFrame/ChatFrame.tsx

✅ DO:
src/pages/ChatPage/
└── ChatFrame/
    ├── ChatFrame.tsx
    └── useChatFrame.ts     # Lives here
```

---

## When to Extract to `components/`

Extract when **ALL** apply:

- [ ] Used by 2+ different pages
- [ ] Truly generic (no page-specific logic)
- [ ] Stable API (props won't change often)
- [ ] Self-contained (minimal dependencies)

**Do NOT extract when:**

- Used by only 1 page → Keep in page folder
- Used by siblings in same page → Keep at page root
- Contains page-specific logic → Keep local
- Still evolving → Keep local, extract later

---

## Import Order

```tsx
// 1. React
import { useState, useEffect } from 'react'

// 2. External libraries
import { useQuery } from '@tanstack/react-query'

// 3. Absolute imports (shared)
import { Button } from '@/components/Button'
import { useAuth } from '@/hooks/useAuth'

// 4. Relative imports (local - same page/component tree)
import { ChatInput } from './ChatInput'
import { useChatFrame } from './useChatFrame'

// 5. Types
import type { Message } from '@/types/chat.types'

// 6. Styles
import './ChatFrame.css'
```

---

## Anti-Patterns

### ❌ Separate `components/` folder inside pages

```
❌ DON'T:
pages/ChatPage/
├── ChatPage.tsx
├── components/          # ❌ Don't create this!
│   ├── ChatFrame.tsx
│   └── ChatInput.tsx
└── context/             # ❌ Don't create this!
    └── ChatContext.tsx

✅ DO:
pages/ChatPage/
├── ChatPage.tsx
├── ChatFrame/           # Children in parent folder
│   ├── ChatFrame.tsx
│   ├── ChatContext.tsx  # Context with component
│   └── ChatInput.tsx
```

### ❌ Barrel Files

```tsx
// ❌ DON'T
import { ChatFrame, ChatInput } from '@/pages/ChatPage'

// ✅ DO
import { ChatFrame } from '@/pages/ChatPage/ChatFrame/ChatFrame'
```

### ❌ Premature Extraction

```
❌ DON'T: Extract before needed
components/
└── ChatStatusBadge.tsx  # Only used in ChatPage!

✅ DO: Keep local
pages/ChatPage/StatusBadge.tsx
```

---

## Quick Reference

```
Q: Where does child component go?
A: Directly in parent folder. NO separate components/ subfolder.

Q: Where does context go?
A: Same folder as the component that provides it.

Q: Where does hook go?
A: Same folder as the component that uses it (if used by 1).
   In hooks/ only if used app-wide.

Q: File or Folder?
A: Has children OR related files (css, hook)? → Folder
   Just a simple component? → File

Q: When to extract to components/?
A: Only when 2+ different pages need it.

Q: Shared within one page?
A: Keep at that page's root folder.
```
