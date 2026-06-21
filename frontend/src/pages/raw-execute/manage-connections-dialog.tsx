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
    // after React has re-rendered (i.e. after the LoginForm's dispatch fires).
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
                                                <TooltipTrigger>
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
                                                onClick={() =>{  handleEdit(profile); }}
                                                aria-label={t("editConnection")}
                                            >
                                                <PencilSquareIcon className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() =>{  handleDeleteClick(profile); }}
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
                        onLoginSuccess={editingProfile ? handleEditSuccess : () =>{  setShowEditSheet(false); }}
                    />
                </SheetContent>
            </Sheet>
        </>
    );
};
