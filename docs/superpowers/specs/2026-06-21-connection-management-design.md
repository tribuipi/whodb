# Connection Management — Design Spec

**Date:** 2026-06-21  
**Branch:** feat/sql-editor-redesign  
**Status:** Approved

## Overview

Add a "Manage connections..." entry to the profile dropdown in the SQL Editor (`/raw-execute`). Clicking it opens a dialog where the user can view, add, edit, and delete connections. All connection management is consolidated in this one dialog; the existing "Add New Connection" item in the dropdown is removed and moved into the dialog.

## Entry Point

**File:** `frontend/src/pages/raw-execute/source-selectors.tsx`

- Remove the existing "Add New Connection" `CommandItem` and the `Sheet`/`LoginForm` it owns.
- Add a single new `CommandItem` labelled "Manage connections..." that sets `showManageConnections = true`.
- Pass `showManageConnections` and `onOpenChange` to the new `ManageConnectionsDialog`.

## `ManageConnectionsDialog` Component

**New file:** `frontend/src/pages/raw-execute/manage-connections-dialog.tsx`

A centered `Dialog` (not a Sheet) listing all profiles from Redux state.

### Layout

```
┌─ Manage Connections ──────────────────────┐
│                                           │
│  ┌─────────────────────────────────────┐  │
│  │ 🐘 postgres@localhost/mydb          │  │
│  │    Hostname · Username              │  │
│  │                          [Edit] [✕] │  │
│  ├─────────────────────────────────────┤  │
│  │ 🍃 mongo@10.0.0.1/dev  [env] ⓘ     │  │
│  │    Hostname · Username              │  │
│  └─────────────────────────────────────┘  │
│                                           │
│                    [+ Add New Connection] │
└───────────────────────────────────────────┘
```

### Connection rows

- Each row shows: DB icon, display label (type + hostname/database), subtitle with key fields (hostname, username).
- **Environment/server-defined rows** (`IsEnvironmentDefined === true` or `Source !== "builtin"`): show an `Environment` badge with a tooltip ("This connection is managed via environment variables and cannot be edited or deleted."). No Edit or Delete buttons.
- **User-created rows**: show Edit and Delete (✕ icon) buttons.

### Add New Connection

A `+ Add New Connection` button at the bottom of the dialog opens the edit Sheet without `initialValues` (identical to the current add-connection flow).

## Edit Flow

1. User clicks "Edit" on a connection row.
2. The manage-connections `Dialog` closes.
3. A `Sheet` (right side) opens containing the `LoginForm`.
4. The `LoginForm` receives a new optional prop `initialValues: LoginFormInitialValues` (see below), seeded from the profile's Redux state.
5. On successful login:
   - `AuthActions.remove({ id: oldProfileId })` removes the old profile entry.
   - `AuthActions.login` (called inside the form's existing submit handler) adds the new profile.
   - The Sheet closes; the manage dialog stays closed.

### `LoginFormInitialValues` type

```typescript
interface LoginFormInitialValues {
  databaseType: string;   // SourceTypeItem id
  hostname: string;
  username: string;
  password: string;
  database: string;
  advancedForm: Record<string, string>;
}
```

Added as an optional prop to `LoginFormProps`. A single `useEffect` on mount seeds the form state from these values (runs once, does not re-run on prop changes).

The `LoginForm` must also accept an `oldProfileId?: string` prop so that, on `onLoginSuccess`, the dialog can call `AuthActions.remove` for the right profile.

## Delete Flow

1. User clicks ✕ on a connection row.
2. An `AlertDialog` opens (inline, the manage dialog stays visible behind it):
   - Title: "Delete connection?"
   - Body: the connection's display label.
   - Buttons: "Cancel" and "Delete" (destructive variant).
3. On confirm:
   - **Not the current profile:** `AuthActions.remove({ id })` — done.
   - **Current profile, other profiles exist:** call `useProfileSwitch` to switch to the next profile in the list, then `AuthActions.remove({ id })` on success.
   - **Current profile, last profile:** navigate to `/logout`.

## Localization

New keys added to `en_US` in `frontend/src/locales/components/sidebar.yaml`:

```yaml
manageConnections: Manage connections...
manageConnectionsTitle: Manage Connections
addNewConnection: Add New Connection
editConnection: Edit
deleteConnection: Delete
deleteConnectionConfirmTitle: Delete connection?
deleteConnectionConfirmDescription: "Remove \"{name}\" from your connections?"
environmentBadge: Environment
environmentBadgeTooltip: "This connection is managed via environment variables and cannot be edited or deleted."
```

No other locale files are touched (project rule: `en_US` only unless explicitly asked).

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/pages/raw-execute/source-selectors.tsx` | Remove add-connection Sheet + CommandItem; add "Manage connections..." CommandItem |
| `frontend/src/pages/raw-execute/manage-connections-dialog.tsx` | **New** — Dialog with connection list, edit Sheet, delete AlertDialog |
| `frontend/src/pages/auth/login.tsx` | Add `initialValues` and `oldProfileId` optional props to `LoginFormProps` |
| `frontend/src/locales/components/sidebar.yaml` | Add 9 new `en_US` keys |

## Out of Scope

- No backend changes — all operations are client-side Redux (`AuthActions.remove`, `AuthActions.login`) plus the existing `LoginSource` mutation.
- No changes to the sidebar's existing profile management (logout, switch dialog).
- No search/filter within the manage dialog (can be added later if the list grows large).
