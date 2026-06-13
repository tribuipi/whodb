import { skipToken, useQuery } from "@apollo/client/react";
import type { FC, ReactElement } from "react";
import { useCallback, useMemo, useState } from "react";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { PlusCircleIcon } from "../../components/heroicons";
import { LoginForm } from "../auth/login";

/**
 * Profile and database dropdowns rendered in the SQL editor's left-panel header.
 * Reuses the same switch mechanism and visual style as the main sidebar.
 */
export const SourceSelectors: FC = () => {
    const { t } = useTranslation('components/sidebar');
    const current = useAppSelector(state => state.auth.current);
    const profiles = useAppSelector(state => state.auth.profiles);
    const sslStatus = useAppSelector(state => state.auth.sslStatus);
    const isEmbedded = useAppSelector(state => state.auth.isEmbedded);
    const awsProviderEnabled = useAppSelector(state => state.settings.awsProviderEnabled);
    const azureProviderEnabled = useAppSelector(state => state.settings.azureProviderEnabled);
    const gcpProviderEnabled = useAppSelector(state => state.settings.gcpProviderEnabled);
    const { supportsDatabaseSwitching } = useSourceContract(current?.Type);
    const { switchProfile } = useProfileSwitch({ skipNavigation: true });
    const { items: sourceTypeItems } = useSourceTypeItems();
    const [showLoginCard, setShowLoginCard] = useState(false);

    const databaseQueryOptions = current != null && supportsDatabaseSwitching && current.Type
        ? { variables: { sourceType: current.Type } }
        : skipToken;
    const { data: availableDatabases, loading: databasesLoading } = useQuery(
        SourceFieldOptionsDocument,
        databaseQueryOptions,
    );

    const profileOptions = useMemo(
        () => profiles
            .filter(profile => {
                if (isAwsHostname(profile.Hostname)) return awsProviderEnabled;
                if (isAzureHostname(profile.Hostname)) return azureProviderEnabled;
                if (isGcpHostname(profile.Hostname)) return gcpProviderEnabled;
                return true;
            })
            .map(profile => ({
                value: profile.Id,
                label: getProfileLabel(profile, findSourceTypeItem(sourceTypeItems, profile.Type)),
                icon: (
                    <DatabaseIconWithBadge
                        icon={getProfileIcon(profile) as ReactElement}
                        showCloudBadge={isAwsConnection(profile.Id) || isAzureConnection(profile.Id) || isGcpConnection(profile.Id)}
                        sslStatus={profile.Id === current?.Id
                            ? sslStatus
                            : (profile.SSLConfigured ? { IsEnabled: true, Mode: 'configured' } : undefined)}
                        size="sm"
                    />
                ),
            })),
        [profiles, current?.Id, sslStatus, awsProviderEnabled, azureProviderEnabled, gcpProviderEnabled, sourceTypeItems],
    );

    const databaseOptions = useMemo(
        () => (availableDatabases?.SourceFieldOptions ?? []).map(db => ({ value: db, label: db })),
        [availableDatabases],
    );

    const handleAddProfile = useCallback(() => {
        setTimeout(() =>{  setShowLoginCard(true); }, 100);
    }, []);

    return (
        <>
            <div
                className="flex flex-col gap-2 p-2 border-b border-neutral-200 dark:border-neutral-800"
                data-testid="sql-editor-source-selectors"
            >
                <SearchSelect
                    label={t('profile')}
                    options={profileOptions}
                    value={current?.Id}
                    onChange={(id: string) => {
                        const p = profiles.find(x => x.Id === id);
                        if (p) void switchProfile(p);
                    }}
                    placeholder={t('selectProfile')}
                    searchPlaceholder={t('searchProfile')}
                    buttonClassName={ph.mask}
                    extraOptions={!isEmbedded ? (
                        <CommandItem key="__add__" value="__add__" onSelect={handleAddProfile}>
                            <span className="flex items-center gap-sm text-green-500">
                                <PlusCircleIcon className="w-4 h-4 stroke-green-500" />
                                {t('addAnotherProfile')}
                            </span>
                        </CommandItem>
                    ) : undefined}
                />
                {supportsDatabaseSwitching && (
                    <SearchSelect
                        label={t('database')}
                        options={databaseOptions}
                        value={current?.Database}
                        disabled={databasesLoading}
                        onChange={(db: string) => {
                            if (!db || !current) return;
                            void switchProfile(current, db);
                        }}
                        placeholder={t('selectDatabase')}
                        searchPlaceholder={t('searchDatabase')}
                        buttonClassName={ph.mask}
                    />
                )}
            </div>
            <Sheet open={showLoginCard} onOpenChange={setShowLoginCard}>
                <SheetContent side="right" className="p-8">
                    <span className="sr-only">
                        <SheetTitle>{t('databaseLogin')}</SheetTitle>
                    </span>
                    <LoginForm advancedDirection="vertical" onLoginSuccess={() =>{  setShowLoginCard(false); }} />
                </SheetContent>
            </Sheet>
        </>
    );
};
