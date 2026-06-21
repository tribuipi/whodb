# Connection Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Manage connections..." entry to the SQL Editor's profile dropdown that opens a dialog where users can add, edit, and delete connections.

**Architecture:** A new `ManageConnectionsDialog` component owns all connection-management UI (list, edit Sheet, delete AlertDialog). `source-selectors.tsx` is updated to remove its old inline add-connection Sheet and route to the new dialog instead. `LoginForm` gets a new `initialValues` optional prop so the edit flow can pre-fill credentials from an existing profile.

**Tech Stack:** React 18 + TypeScript, Redux Toolkit (`AuthActions`), Apollo Client (`LoginSource` mutation), Base UI (`Dialog`, `AlertDialog`, `Sheet`), `useProfileSwitch` hook, `react-router-dom`

## Global Constraints

- All new user-facing strings go into `en_US` in `frontend/src/locales/components/sidebar.yaml` only — no other locale files
- No backend changes — all mutations are the existing `LoginSource`; profile removal is client-side only
- No copyright/license headers on new files
- Run `cd frontend && pnpm run build:ce` after each task to verify TypeScript compiles cleanly
- Linting runs automatically via hook after every Edit/Write — fix any `oxlint` errors before committing

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `frontend/src/pages/auth/login.tsx` | Modify | Add `LoginFormInitialValues` type + `initialValues` prop + seed effect |
| `frontend/src/locales/components/sidebar.yaml` | Modify | Add 9 new `en_US` keys |
| `frontend/src/pages/raw-execute/manage-connections-dialog.tsx` | **Create** | Dialog listing profiles, edit Sheet, delete AlertDialog |
| `frontend/src/pages/raw-execute/source-selectors.tsx` | Modify | Remove inline add-connection flow; add ManageConnectionsDialog |

---

## Task 1: Add `initialValues` prop to `LoginForm`

**Files:**
- Modify: `frontend/src/pages/auth/login.tsx`

**Interfaces:**
- Produces: `export interface LoginFormInitialValues` (used by Task 3)
- Produces: `initialValues?: LoginFormInitialValues` on `LoginFormProps`

---

- [ ] **Step 1: Export the `LoginFormInitialValues` interface**

  In `frontend/src/pages/auth/login.tsx`, after the closing `}` of `LoginFormProps` (line ~180), add:

  ```typescript
  export interface LoginFormInitialValues {
    databaseType: string;
    hostname: string;
    username: string;
    password: string;
    database: string;
    advancedForm: Record<string, string>;
  }
  ```

- [ ] **Step 2: Add `initialValues` to `LoginFormProps`**

  In `frontend/src/pages/auth/login.tsx`, add one line to `LoginFormProps` (after `advancedDirection`):

  ```typescript
  export interface LoginFormProps {
      onLoginSuccess?: () => void;
      hideHeader?: boolean;
      compact?: boolean;
      className?: string;
      advancedDirection?: "horizontal" | "vertical";
      initialValues?: LoginFormInitialValues;   // ← add this line
  }
  ```

- [ ] **Step 3: Destructure `initialValues` in the component**

  The `LoginForm` component declaration starts around line 182:
  ```typescript
  export const LoginForm: FC<LoginFormProps> = ({
      onLoginSuccess,
      hideHeader = false,
      className = "",
      advancedDirection = "horizontal",
  }) => {
  ```

  Add `initialValues` to the destructuring:
  ```typescript
  export const LoginForm: FC<LoginFormProps> = ({
      onLoginSuccess,
      hideHeader = false,
      className = "",
      advancedDirection = "horizontal",
      initialValues,
  }) => {
  ```

- [ ] **Step 4: Add the `initialValuesApplied` guard ref**

  The component declares refs around line 193–195:
  ```typescript
  const usernameInputRef = useRef<HTMLInputElement>(null);
  const handleSubmitRef = useRef<() => void>(() => {});
  const handleLoginWithSourceProfileSubmitRef = useRef<(overrideProfileId?: string) => void>(() => {});
  ```

  Add a new ref immediately after those three:
  ```typescript
  const initialValuesApplied = useRef(false);
  ```

- [ ] **Step 5: Add the seed `useEffect`**

  Locate the effect whose deps are `[databaseType.id, databaseTypeItems]` (around line 247–257):
  ```typescript
  useEffect(() => {
      if (databaseTypeItems.length === 0) {
          return;
      }
      const nextType = databaseTypeItems.find(item => item.id === databaseType.id) ?? databaseTypeItems[0];
      if (databaseType.id !== nextType.id) {
          setDatabaseType(nextType);
          setAdvancedForm(nextType.extra ?? {});
      }
  }, [databaseType.id, databaseTypeItems]);
  ```

  **Immediately after** that effect's closing `}, [...]` line, insert:

  ```typescript
  // Seed form state from initialValues once, after database types have loaded.
  // Must run after the databaseTypeItems effect so our type/advancedForm take precedence.
  useEffect(() => {
      if (!initialValues || initialValuesApplied.current || !databaseTypesLoaded || databaseTypeItems.length === 0) return;
      const dbType = databaseTypeItems.find(item => item.id === initialValues.databaseType);
      if (!dbType) return;
      initialValuesApplied.current = true;
      setDatabaseType(dbType);
      setHostName(initialValues.hostname);
      setUsername(initialValues.username);
      setPassword(initialValues.password);
      setDatabase(initialValues.database);
      setAdvancedForm(initialValues.advancedForm);
      if (Object.keys(initialValues.advancedForm).length > 0) {
          setShowAdvanced(true);
      }
  }, [initialValues, databaseTypesLoaded, databaseTypeItems]);
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  cd frontend && pnpm run build:ce 2>&1 | tail -20
  ```
  Expected: no TypeScript errors.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/pages/auth/login.tsx
  git commit -m "feat: add initialValues prop to LoginForm for pre-filling edit flow"
  ```

---

## Task 2: Add localization keys

**Files:**
- Modify: `frontend/src/locales/components/sidebar.yaml`

**Interfaces:**
- Produces: 9 translation keys in the `components/sidebar` namespace (used by Task 3)

---

- [ ] **Step 1: Add keys to `en_US` block**

  In `frontend/src/locales/components/sidebar.yaml`, the `en_US:` block currently ends with:
  ```yaml
  en_US:
    mainNavigation: Main navigation
    ...
    switchProfileDescription: "Choose a profile to continue, or add a new one."
  ```

  Add these 10 keys at the end of the `en_US:` block (before the `ar_AE:` block):
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
    cancel: Cancel
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd frontend && pnpm run build:ce 2>&1 | tail -20
  ```
  Expected: no errors (YAML changes don't affect TS types, but confirms no build regressions).

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/locales/components/sidebar.yaml
  git commit -m "feat: add connection management i18n keys"
  ```

---

## Task 3: Create `ManageConnectionsDialog`

**Files:**
- Create: `frontend/src/pages/raw-execute/manage-connections-dialog.tsx`

**Interfaces:**
- Consumes: `LoginFormInitialValues` from `../auth/login` (Task 1)
- Consumes: translation keys from `components/sidebar` (Task 2)
- Produces: `export interface ManageConnectionsDialogProps` and `export const ManageConnectionsDialog` (used by Task 4)

---

- [ ] **Step 1: Create the file with full implementation**

  Create `frontend/src/pages/raw-execute/manage-connections-dialog.tsx`:

  ```typescript
  import type { FC, ReactElement } from "react";
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import {
      AlertDialog,
      AlertDialogAction,
      AlertDialogCancel,
      AlertDialogContent,
      AlertDialogDescription,
      AlertDialogFooter,
      AlertDialogHeader,
      AlertDialogTitle,
  } from "@/components/ui/alert-dialog";
  import { Badge } from "@/components/ui/badge";
  import { Button } from "@/components/ui/button";
  import {
      Dialog,
      DialogContent,
      DialogHeader,
      DialogTitle,
  } from "@/components/ui/dialog";
  import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
  import {
      Tooltip,
      TooltipContent,
      TooltipProvider,
      TooltipTrigger,
  } from "@/components/ui/tooltip";
  import { DatabaseIconWithBadge, isAwsConnection } from "@/components/aws";
  import { isAzureConnection } from "@/components/azure";
  import { isGcpConnection } from "@/components/gcp";
  import { PencilSquareIcon, PlusCircleIcon, TrashIcon } from "@/components/heroicons";
  import { getProfileIcon, getProfileLabel } from "@/components/sidebar/sidebar";
  import { findSourceTypeItem } from "@/config/source-types";
  import { InternalRoutes } from "@/config/routes";
  import { useTranslation } from "@/hooks/use-translation";
  import { useProfileSwitch } from "@/hooks/use-profile-switch";
  import { useSourceTypeItems } from "@/hooks/useSourceCatalog";
  import { AuthActions, type LocalLoginProfile } from "@/store/auth";
  import { useAppDispatch, useAppSelector } from "@/store/hooks";
  import { LoginForm, type LoginFormInitialValues } from "../auth/login";

  export interface ManageConnectionsDialogProps {
      open: boolean;
      onOpenChange: (open: boolean) => void;
  }

  function isExternallyManaged(profile: LocalLoginProfile): boolean {
      return (
          profile.IsEnvironmentDefined === true ||
          (profile.Source != null && profile.Source !== "" && profile.Source !== "builtin")
      );
  }

  function buildInitialValues(profile: LocalLoginProfile): LoginFormInitialValues {
      return {
          databaseType: profile.Type,
          hostname: profile.Hostname,
          username: profile.Username,
          password: profile.Password,
          database: profile.Database,
          advancedForm: profile.Advanced.reduce<Record<string, string>>((acc, v) => {
              acc[v.Key] = v.Value;
              return acc;
          }, {}),
      };
  }

  export const ManageConnectionsDialog: FC<ManageConnectionsDialogProps> = ({
      open,
      onOpenChange,
  }) => {
      const { t } = useTranslation("components/sidebar");
      const dispatch = useAppDispatch();
      const navigate = useNavigate();
      const profiles = useAppSelector(state => state.auth.profiles);
      const current = useAppSelector(state => state.auth.current);
      const { items: sourceTypeItems } = useSourceTypeItems();

      const [editingProfile, setEditingProfile] = useState<LocalLoginProfile | null>(null);
      const [showEditSheet, setShowEditSheet] = useState(false);
      const [deletingProfile, setDeletingProfile] = useState<LocalLoginProfile | null>(null);
      const [showDeleteAlert, setShowDeleteAlert] = useState(false);

      // Tracks which profile ID to remove after a successful profile switch.
      // Using a ref so the switchProfile onSuccess callback always sees the latest value.
      const pendingDeleteIdRef = useRef<string | null>(null);

      // Latest current profile ID, kept in a ref so handleEditSuccess can read it
      // after React has re-rendered (i.e. after the LoginForm dispatch fires).
      const currentIdRef = useRef(current?.Id);
      useEffect(() => {
          currentIdRef.current = current?.Id;
      }, [current?.Id]);

      const handleSwitchSuccess = useCallback(() => {
          const id = pendingDeleteIdRef.current;
          if (id) {
              dispatch(AuthActions.remove({ id }));
              pendingDeleteIdRef.current = null;
          }
      }, [dispatch]);

      const switchOptions = useMemo(() => ({
          skipNavigation: true as const,
          onSuccess: handleSwitchSuccess,
      }), [handleSwitchSuccess]);

      const { switchProfile } = useProfileSwitch(switchOptions);

      const handleEdit = useCallback((profile: LocalLoginProfile) => {
          setEditingProfile(profile);
          setShowEditSheet(true);
          onOpenChange(false);
      }, [onOpenChange]);

      const handleAddNew = useCallback(() => {
          setEditingProfile(null);
          setShowEditSheet(true);
          onOpenChange(false);
      }, [onOpenChange]);

      const handleDeleteClick = useCallback((profile: LocalLoginProfile) => {
          setDeletingProfile(profile);
          setShowDeleteAlert(true);
      }, []);

      const handleDeleteConfirm = useCallback(() => {
          if (!deletingProfile) return;
          const id = deletingProfile.Id;
          setShowDeleteAlert(false);
          setDeletingProfile(null);

          if (current?.Id !== id) {
              dispatch(AuthActions.remove({ id }));
              return;
          }

          const remaining = profiles.filter(p => p.Id !== id);
          if (remaining.length === 0) {
              void navigate(InternalRoutes.Logout.path);
              return;
          }

          pendingDeleteIdRef.current = id;
          void switchProfile(remaining[0]);
      }, [deletingProfile, current, profiles, dispatch, navigate, switchProfile]);

      const handleEditSuccess = useCallback(() => {
          const profileToRemove = editingProfile;
          setShowEditSheet(false);
          setEditingProfile(null);
          if (!profileToRemove) return;

          // Defer one tick so React re-renders from the LoginForm's dispatch first.
          // Then check: if the new current ID differs from the old profile ID, remove the old one.
          // (Same ID = desktop app, credentials unchanged → already updated in-place, no removal needed.)
          setTimeout(() => {
              if (currentIdRef.current !== profileToRemove.Id) {
                  dispatch(AuthActions.remove({ id: profileToRemove.Id }));
              }
          }, 0);
      }, [editingProfile, dispatch]);

      return (
          <>
              <Dialog open={open} onOpenChange={onOpenChange}>
                  <DialogContent className="max-w-lg" showCloseButton>
                      <DialogHeader>
                          <DialogTitle>{t("manageConnectionsTitle")}</DialogTitle>
                      </DialogHeader>

                      <div className="flex flex-col divide-y divide-neutral-200 dark:divide-neutral-800 max-h-[60vh] overflow-y-auto">
                          {profiles.map(profile => {
                              const external = isExternallyManaged(profile);
                              const sourceTypeItem = findSourceTypeItem(sourceTypeItems, profile.Type);
                              const label = getProfileLabel(profile, sourceTypeItem);
                              const icon = getProfileIcon(profile) as ReactElement;
                              const showCloudBadge =
                                  isAwsConnection(profile.Id) ||
                                  isAzureConnection(profile.Id) ||
                                  isGcpConnection(profile.Id);

                              return (
                                  <div
                                      key={profile.Id}
                                      className="flex items-center gap-3 py-3 px-1"
                                  >
                                      <DatabaseIconWithBadge
                                          icon={icon}
                                          showCloudBadge={showCloudBadge}
                                          size="sm"
                                      />
                                      <div className="flex flex-col flex-1 min-w-0">
                                          <span className="text-sm font-medium truncate">{label}</span>
                                          {profile.Hostname && profile.Username && (
                                              <span className="text-xs text-muted-foreground truncate">
                                                  {profile.Hostname} · {profile.Username}
                                              </span>
                                          )}
                                      </div>
                                      {external ? (
                                          <TooltipProvider>
                                              <Tooltip>
                                                  <TooltipTrigger asChild>
                                                      <Badge variant="secondary" className="shrink-0 cursor-default">
                                                          {t("environmentBadge")}
                                                      </Badge>
                                                  </TooltipTrigger>
                                                  <TooltipContent side="left">
                                                      {t("environmentBadgeTooltip")}
                                                  </TooltipContent>
                                              </Tooltip>
                                          </TooltipProvider>
                                      ) : (
                                          <div className="flex items-center gap-1 shrink-0">
                                              <Button
                                                  variant="ghost"
                                                  size="icon-sm"
                                                  onClick={() => handleEdit(profile)}
                                                  aria-label={t("editConnection")}
                                              >
                                                  <PencilSquareIcon className="w-4 h-4" />
                                              </Button>
                                              <Button
                                                  variant="ghost"
                                                  size="icon-sm"
                                                  onClick={() => handleDeleteClick(profile)}
                                                  aria-label={t("deleteConnection")}
                                                  className="text-destructive hover:text-destructive"
                                              >
                                                  <TrashIcon className="w-4 h-4" />
                                              </Button>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>

                      <div className="flex justify-end pt-2 border-t border-neutral-200 dark:border-neutral-800">
                          <Button variant="outline" onClick={handleAddNew}>
                              <PlusCircleIcon className="w-4 h-4 stroke-current" />
                              {t("addNewConnection")}
                          </Button>
                      </div>
                  </DialogContent>
              </Dialog>

              <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
                  <AlertDialogContent size="sm">
                      <AlertDialogHeader>
                          <AlertDialogTitle>{t("deleteConnectionConfirmTitle")}</AlertDialogTitle>
                          <AlertDialogDescription>
                              {t("deleteConnectionConfirmDescription", {
                                  name: deletingProfile
                                      ? getProfileLabel(
                                            deletingProfile,
                                            findSourceTypeItem(sourceTypeItems, deletingProfile.Type),
                                        )
                                      : "",
                              })}
                          </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                          <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                          <AlertDialogAction variant="destructive" onClick={handleDeleteConfirm}>
                              {t("deleteConnection")}
                          </AlertDialogAction>
                      </AlertDialogFooter>
                  </AlertDialogContent>
              </AlertDialog>

              <Sheet open={showEditSheet} onOpenChange={setShowEditSheet}>
                  <SheetContent side="right" className="p-8">
                      <span className="sr-only">
                          <SheetTitle>
                              {editingProfile ? t("editConnection") : t("addNewConnection")}
                          </SheetTitle>
                      </span>
                      <LoginForm
                          advancedDirection="vertical"
                          initialValues={editingProfile ? buildInitialValues(editingProfile) : undefined}
                          onLoginSuccess={editingProfile ? handleEditSuccess : () => setShowEditSheet(false)}
                      />
                  </SheetContent>
              </Sheet>
          </>
      );
  };
  ```

- [ ] **Step 2: Verify TypeScript compiles**

  ```bash
  cd frontend && pnpm run build:ce 2>&1 | tail -30
  ```
  Expected: no errors. Common issues to fix:
  - `AlertDialogAction` requires `variant` — already passed as `"destructive"`
  - `size="icon-sm"` on `Button` — verify this size is defined in `button.tsx`; if not, use `size="icon"` instead
  - `TooltipTrigger asChild` — only valid on a single React element child; the `Badge` satisfies this

- [ ] **Step 4: Check `Button` size="icon-sm" is valid**

  ```bash
  grep "icon-sm" frontend/src/components/ui/button.tsx
  ```
  If no output, replace `size="icon-sm"` with `size="icon"` in the new file.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/pages/raw-execute/manage-connections-dialog.tsx
  git add frontend/src/locales/components/sidebar.yaml
  git commit -m "feat: add ManageConnectionsDialog with edit and delete flows"
  ```

---

## Task 4: Update `source-selectors.tsx`

**Files:**
- Modify: `frontend/src/pages/raw-execute/source-selectors.tsx`

**Interfaces:**
- Consumes: `ManageConnectionsDialog`, `ManageConnectionsDialogProps` from `./manage-connections-dialog` (Task 3)

---

- [ ] **Step 1: Replace `showLoginCard` state with `showManageConnections`**

  In `frontend/src/pages/raw-execute/source-selectors.tsx`, find line 39:
  ```typescript
  const [showLoginCard, setShowLoginCard] = useState(false);
  ```
  Replace with:
  ```typescript
  const [showManageConnections, setShowManageConnections] = useState(false);
  ```

- [ ] **Step 2: Remove `handleAddProfile` callback**

  Remove these lines (around line 91–93):
  ```typescript
  const handleAddProfile = useCallback(() => {
      setTimeout(() =>{  setShowLoginCard(true); }, 100);
  }, []);
  ```

- [ ] **Step 3: Replace the `extraOptions` block in `SearchSelect`**

  Find the `extraOptions` prop (lines ~112–119):
  ```typescript
  extraOptions={!isEmbedded ? (
      <CommandItem key="__add__" value="__add__" onSelect={handleAddProfile}>
          <span className="flex items-center gap-sm text-green-500">
              <PlusCircleIcon className="w-4 h-4 stroke-green-500" />
              {t('addAnotherProfile')}
          </span>
      </CommandItem>
  ) : undefined}
  ```

  Replace with:
  ```typescript
  extraOptions={!isEmbedded ? (
      <CommandItem key="__manage__" value="__manage__" onSelect={() => setTimeout(() => setShowManageConnections(true), 100)}>
          <span className="flex items-center gap-sm">
              <AdjustmentsHorizontalIcon className="w-4 h-4" />
              {t('manageConnections')}
          </span>
      </CommandItem>
  ) : undefined}
  ```

- [ ] **Step 4: Replace the `Sheet` + `LoginForm` block with `ManageConnectionsDialog`**

  Find and remove these lines (around 137–144):
  ```typescript
  <Sheet open={showLoginCard} onOpenChange={setShowLoginCard}>
      <SheetContent side="right" className="p-8">
          <span className="sr-only">
              <SheetTitle>{t('databaseLogin')}</SheetTitle>
          </span>
          <LoginForm advancedDirection="vertical" onLoginSuccess={() =>{  setShowLoginCard(false); }} />
      </SheetContent>
  </Sheet>
  ```

  Replace with:
  ```typescript
  <ManageConnectionsDialog open={showManageConnections} onOpenChange={setShowManageConnections} />
  ```

- [ ] **Step 5: Update imports**

  Remove unused imports: `Sheet`, `SheetContent`, `SheetTitle`, `PlusCircleIcon`, `LoginForm`.
  Add new imports:

  ```typescript
  import { AdjustmentsHorizontalIcon } from "../../components/heroicons";
  import { ManageConnectionsDialog } from "./manage-connections-dialog";
  ```

  The full updated import block at the top of `source-selectors.tsx` should look like:
  ```typescript
  import { skipToken, useQuery } from "@apollo/client/react";
  import type { FC, ReactElement } from "react";
  import { useCallback, useEffect, useMemo, useRef, useState } from "react";
  import { SearchSelect } from "../../components/ux";
  import { SourceFieldOptionsDocument } from "@graphql";
  import { useProfileSwitch } from "@/hooks/use-profile-switch";
  import { getProfileLabel, getProfileIcon } from "../../components/sidebar/sidebar";
  import { useSourceContract } from "../../hooks/useSourceContract";
  import { useAppSelector } from "../../store/hooks";
  import { useTranslation } from "@/hooks/use-translation";
  import { useSourceTypeItems } from "@/hooks/useSourceCatalog";
  import { findSourceTypeItem } from "@/config/source-types";
  import { DatabaseIconWithBadge, isAwsConnection } from "@/components/aws";
  import { isAzureConnection } from "@/components/azure";
  import { isGcpConnection } from "@/components/gcp";
  import { isAwsHostname, isAzureHostname, isGcpHostname } from "@/utils/cloud-connection-prefill";
  import { ph } from "@/utils/privacy";
  import { CommandItem } from "@/components/ui/command";
  import { AdjustmentsHorizontalIcon } from "../../components/heroicons";
  import { ManageConnectionsDialog } from "./manage-connections-dialog";
  ```

- [ ] **Step 6: Verify TypeScript compiles**

  ```bash
  cd frontend && pnpm run build:ce 2>&1 | tail -20
  ```
  Expected: no errors.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/pages/raw-execute/source-selectors.tsx
  git commit -m "feat: replace inline add-connection flow with ManageConnectionsDialog"
  ```

---

## Final Verification

- [ ] Start the frontend dev server:
  ```bash
  cd frontend && pnpm start
  ```

- [ ] Navigate to `/scratchpad` (SQL Editor). In the profile dropdown, verify:
  - "Manage connections..." appears (no "Add New Connection" item)
  - The item is hidden when `isEmbedded` is true

- [ ] Click "Manage connections..." → dialog opens, all active profiles are listed

- [ ] For a user-created profile: Edit button opens pre-filled form; submit with changed hostname logs in with new credentials and removes old profile from list

- [ ] For a user-created profile: Delete opens confirmation dialog with profile name; confirm removes the profile

- [ ] Delete the currently active profile (with at least one other profile available): app auto-switches to the next profile

- [ ] Delete the last remaining profile: app navigates to `/logout`

- [ ] For an env-defined profile (`IsEnvironmentDefined: true` or `Source !== "builtin"`): only the badge + tooltip is shown, no Edit/Delete buttons

- [ ] "+ Add New Connection" button in the dialog opens blank login form; submit adds a new profile
