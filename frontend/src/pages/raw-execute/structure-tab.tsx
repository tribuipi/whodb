import type { FC } from "react";
import { useQuery, skipToken } from "@apollo/client/react";
import { SourceFieldConstraintsDocument } from "@graphql";
import type { SourceFieldConstraintsQuery } from "@graphql";
import { useAppSelector } from "../../store/hooks";
import { useTranslation } from "../../hooks/use-translation";

type IStructureTabProps = { tabId: string };

type ColumnEntry = SourceFieldConstraintsQuery["SourceFieldConstraints"][number];

/** Read-only table structure view: columns, types, nullability, defaults, and keys. */
export const StructureTab: FC<IStructureTabProps> = ({ tabId }) => {
  const { t } = useTranslation("pages/raw-execute");
  const target = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.target);

  const keyLabel = (col: ColumnEntry): string => {
    if (col.Primary) return t("keyPrimary");
    if (col.ForeignKey != null) return `${t("keyForeign")} → ${col.ForeignKey.Table}.${col.ForeignKey.Column}`;
    if (col.Unique) return t("keyUnique");
    return "";
  };

  const { data, loading } = useQuery(
    SourceFieldConstraintsDocument,
    target != null ? { variables: { ref: target } } : skipToken,
  );

  if (loading) {
    return <div className="p-4 text-xs text-neutral-500">{t("loading")}</div>;
  }

  const columns = data?.SourceFieldConstraints ?? [];

  return (
    <div className="h-full overflow-auto p-2" data-testid="sql-editor-structure-tab">
      <table className="w-full text-xs border-collapse">
        <thead>
          <tr className="text-left text-neutral-500">
            <th className="px-2 py-1">{t("colName")}</th>
            <th className="px-2 py-1">{t("colType")}</th>
            <th className="px-2 py-1">{t("colNullable")}</th>
            <th className="px-2 py-1">{t("colDefault")}</th>
            <th className="px-2 py-1">{t("colKey")}</th>
          </tr>
        </thead>
        <tbody>
          {columns.map(col => (
            <tr key={col.Name} className="border-t border-neutral-100 dark:border-neutral-900">
              <td className="px-2 py-1 font-mono">{col.Name}</td>
              <td className="px-2 py-1">{col.Type}</td>
              <td className="px-2 py-1">{col.Nullable === true ? t("yes") : t("no")}</td>
              <td className="px-2 py-1">{col.DefaultValue ?? ""}</td>
              <td className="px-2 py-1">{keyLabel(col)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
