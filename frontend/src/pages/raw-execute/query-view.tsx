/*
 * Copyright 2026 Clidey, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import {useLazyQuery} from "@apollo/client/react";
import {Button} from "@/components/ui/button";
import type {FC} from "react";
import React, { useEffect} from "react";
import {useTranslation} from "../../hooks/use-translation";
import { ResultGrid } from "../../components/result-grid";
import {RawExecuteDocument} from "../../generated/graphql";
import {ArrowDownCircleIcon, CheckCircleIcon} from "../../components/heroicons";
import {useAppSelector} from "../../store/hooks";

type PromiseFunction = (code: string) => Promise<any>;

export type IPluginProps = {
    code: string;
    handleExecuteRef: React.MutableRefObject<PromiseFunction | null>;
    providerId?: string;
    modelType: string;
    token?: string;
    schema: string;
    containerWidth?: number;
    height?: number;
    onResult?: (totalCount: number | null) => void;
}

// Vertical space the toolbar occupies (button h-9 + py-1 ≈ 44px),
// subtracted from the available pane height so the grid fills the rest exactly.
const TABLE_CHROME = 45;

function isSQLQueryAction(code?: string): boolean {
    if (code == null) {
        return true;
    }
    // Remove comments and trim
    const cleaned = code
        .split("\n")
        .filter((text: string) => !text.trim().startsWith("--"))
        .join("\n")
        .trim()
        .toLowerCase();

    // Match common SQL query starting keywords
    // Accepts: select, with, values, show, explain, describe, etc.
    // (add more as needed)
    return /^(select|with|values|show|explain|describe)\b/.test(cleaned);
}

export const QueryView: FC<IPluginProps> = ({ code, handleExecuteRef, containerWidth, height, onResult }) => {
    const { t } = useTranslation("pages/raw-execute");
    const [rawExecute, { data, loading }] = useLazyQuery(RawExecuteDocument, {
        fetchPolicy: 'network-only',
    });
    const currentType = useAppSelector(state => state.auth.current?.Type);

    // Surface the result's total count to the host (shown in the editor's status bar).
    // Only fires when loading is complete to prevent onResult(null) mid-flight.
    useEffect(() => {
        if (!loading) {
            onResult?.(data?.RawExecute?.TotalCount ?? null);
        }
    }, [data, loading, onResult]);

    const triggerExport = () => {
        window.dispatchEvent(new CustomEvent("menu:trigger-export"));
    };

    // Set the ref to a function that executes the query and returns a promise
    useEffect(() => {
        handleExecuteRef.current = async (code: string) => {
            const result = await rawExecute({
                variables: { query: code },
            });
            if (result.error) {
                throw result.error;
            }
            const data = result.data;
            if (isSQLQueryAction(code) || (data?.RawExecute?.Rows?.length ?? 0) > 0) {
                return data?.RawExecute ?? null;
            }
            return null;
        };
    }, [rawExecute, handleExecuteRef, code]);

    const loadingOverlay = loading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 dark:bg-[#0a0a0a]/70 backdrop-blur-[1px]">
            <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                {t("executingQuery")}
            </div>
        </div>
    );

    if (data == null) {
        if (!loading) {
            return null;
        }
        return (
            <div className="relative w-full h-full">
                {loadingOverlay}
            </div>
        );
    }

    if (isSQLQueryAction(code) || data.RawExecute.Rows.length > 0) {
        return (
            <div className="relative flex flex-col w-full h-full" data-testid="cell-query-output">
                {loadingOverlay}
                <div
                    className="flex items-center justify-end gap-2 px-2 py-1 flex-shrink-0"
                    data-testid="sql-editor-results-toolbar"
                >
                    <Button
                        variant="secondary"
                        onClick={triggerExport}
                        className="flex gap-sm"
                        data-testid="sql-editor-export"
                    >
                        <ArrowDownCircleIcon className="w-4 h-4" />
                        {t("export")}
                    </Button>
                </div>
                {
                    data.RawExecute.Columns.length > 0 && (
                        <ResultGrid
                            key={containerWidth}
                            data={{
                                columns: data.RawExecute.Columns.map((c: any) => c.Name),
                                columnTypes: data.RawExecute.Columns.map((c: any) => c.Type),
                                rows: data.RawExecute.Rows,
                            }}
                            layout={{ height: Math.max(200, (height ?? 360) - TABLE_CHROME), enforceMinHeight: true }}
                            actions={{ rawQuery: code, hideFooterControls: true }}
                            databaseType={currentType}
                        />
                    )
                }
            </div>
        );
    }

    return (
        <div className="relative" data-testid="cell-action-output">
            {loadingOverlay}
            <div className="bg-white/10 text-neutral-800 dark:text-neutral-300 rounded-lg p-2 flex gap-sm self-start items-center my-4">
                Action Executed
                <CheckCircleIcon className="w-4 h-4" />
            </div>
        </div>
    );
};
