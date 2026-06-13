import { skipToken, useQuery } from "@apollo/client/react";
import type { FC } from "react";
import { useMemo } from "react";
import { SearchSelect } from "../../components/ux";
import { SourceFieldOptionsDocument } from "@graphql";
import { useProfileSwitch } from "@/hooks/use-profile-switch";
import { getProfileLabel } from "../../components/sidebar/sidebar";
import { useSourceContract } from "../../hooks/useSourceContract";
import { useAppSelector } from "../../store/hooks";

/**
 * Profile and database dropdowns rendered in the SQL editor's left-panel header.
 * Reuses the same switch mechanism as the main sidebar.
 */
export const SourceSelectors: FC = () => {
    const current = useAppSelector(state => state.auth.current);
    const profiles = useAppSelector(state => state.auth.profiles);
    const { supportsDatabaseSwitching } = useSourceContract(current?.Type);
    const { switchProfile } = useProfileSwitch({ skipNavigation: true });

    const databaseQueryOptions = current != null && supportsDatabaseSwitching && current.Type
        ? { variables: { sourceType: current.Type } }
        : skipToken;
    const { data: availableDatabases, loading: databasesLoading } = useQuery(
        SourceFieldOptionsDocument,
        databaseQueryOptions,
    );

    const profileOptions = useMemo(
        () => profiles.map(p => ({
            value: p.Id,
            label: getProfileLabel(p, undefined),
        })),
        [profiles],
    );

    const databaseOptions = useMemo(
        () => (availableDatabases?.SourceFieldOptions ?? []).map(db => ({ value: db, label: db })),
        [availableDatabases],
    );

    return (
        <div
            className="flex flex-col gap-2 p-2 border-b border-neutral-200 dark:border-neutral-800"
            data-testid="sql-editor-source-selectors"
        >
            <SearchSelect
                options={profileOptions}
                value={current?.Id}
                onChange={(id: string) => {
                    const p = profiles.find(x => x.Id === id);
                    if (p) void switchProfile(p);
                }}
            />
            {supportsDatabaseSwitching && (
                <SearchSelect
                    options={databaseOptions}
                    value={current?.Database}
                    disabled={databasesLoading}
                    onChange={(db: string) => {
                        if (!db || !current) return;
                        void switchProfile(current, db);
                    }}
                />
            )}
        </div>
    );
};
