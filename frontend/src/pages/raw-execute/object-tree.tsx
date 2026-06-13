import type { FC } from "react";
import { useMemo, useState } from "react";
import { skipToken, useQuery } from "@apollo/client/react";
import { useTranslation } from "../../hooks/use-translation";
import { ChevronRightIcon, ChevronDownIcon } from "../../components/heroicons";
import { GetStorageUnitsDocument } from "@graphql";
import type { GetStorageUnitsQuery } from "@graphql";
import { useAppSelector } from "../../store/hooks";
import { useSourceContract } from "../../hooks/useSourceContract";
import { buildSourceParentRef } from "../../utils/source-refs";

type SourceBrowserObject = GetStorageUnitsQuery["StorageUnit"][number];

type IObjectTreeProps = {
    onSelectObject: (obj: SourceBrowserObject) => void;
    onOpenStructure: (obj: SourceBrowserObject) => void;
};

/** Left-panel DB object tree for the SQL editor. */
export const ObjectTree: FC<IObjectTreeProps> = ({ onSelectObject, onOpenStructure }) => {
    const { t } = useTranslation("pages/raw-execute");
    const current = useAppSelector(state => state.auth.current);
    const schema = useAppSelector(state => state.database.schema);
    const { item } = useSourceContract(current?.Type);
    const [search, setSearch] = useState("");
    const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

    const parentRef = useMemo(() => buildSourceParentRef(item, current, schema), [item, current, schema]);
    const queryOptions = current != null
        ? { variables: { parent: parentRef } }
        : skipToken;
    const { data } = useQuery(GetStorageUnitsDocument, queryOptions);

    const groups = useMemo(() => {
        const allObjs: SourceBrowserObject[] = data?.StorageUnit ?? [];
        const objs = allObjs.filter(o =>
            (o.Name ?? "").toLowerCase().includes(search.toLowerCase()),
        );
        const byKind: Record<string, SourceBrowserObject[]> = {};
        for (const o of objs) {
            const kind: string = o.Kind ?? "";
            if (kind === "") continue;
            (byKind[kind] ??= []).push(o);
        }
        return byKind;
    }, [data, search]);

    return (
        <div className="flex flex-col h-full overflow-hidden" data-testid="sql-editor-object-tree">
            <div className="px-2 py-1 text-xs font-bold uppercase text-neutral-500">
                {schema || t("schemaHeader")}
            </div>
            <input
                value={search}
                onChange={e => { setSearch(e.target.value); }}
                placeholder={t("searchObjects")}
                className="mx-2 mb-2 px-2 py-1 text-xs rounded border border-neutral-200 dark:border-neutral-800 bg-transparent"
                data-testid="sql-editor-tree-search"
            />
            <div className="flex-1 overflow-auto px-1">
                {Object.entries(groups).map(([kind, objs]) => (
                    <div key={kind}>
                        <button
                            className="flex items-center gap-1 w-full px-1 py-1 text-xs uppercase font-semibold text-neutral-500"
                            onClick={() => { setCollapsed(c => ({ ...c, [kind]: !c[kind] })); }}
                        >
                            {collapsed[kind]
                                ? <ChevronRightIcon className="w-3 h-3" />
                                : <ChevronDownIcon className="w-3 h-3" />}
                            <span>{kind}</span>
                            <span className="ml-auto rounded-full bg-neutral-200 dark:bg-neutral-800 px-2">
                                {objs.length}
                            </span>
                        </button>
                        {!collapsed[kind] && objs.map(obj => (
                            <button
                                key={obj.Ref.Locator + obj.Name}
                                className="block w-full text-left pl-5 pr-2 py-0.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-900 rounded"
                                onClick={() => { onSelectObject(obj); }}
                                onDoubleClick={() => { onOpenStructure(obj); }}
                                data-testid={`sql-editor-tree-object-${obj.Name}`}
                            >
                                {obj.Name}
                            </button>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};
