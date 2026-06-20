import type { FC } from "react";
import { useMemo } from "react";
import { useQuery, skipToken } from "@apollo/client/react";
import { SourceFieldConstraintsDocument } from "@graphql";
import type { SourceFieldConstraintsQuery } from "@graphql";
import type { ColDef } from "ag-grid-community";
import { AgGridReact } from "ag-grid-react";
import { useAppSelector } from "../../store/hooks";
import { useTranslation } from "../../hooks/use-translation";
import { useGridTheme } from "../../components/result-grid/use-grid-theme";

type IStructureTabProps = { tabId: string };

type ColumnEntry = SourceFieldConstraintsQuery["SourceFieldConstraints"][number];

/** Read-only table structure view: columns, types, nullability, defaults, and keys. */
export const StructureTab: FC<IStructureTabProps> = ({ tabId }) => {
  const { t } = useTranslation("pages/raw-execute");
  const target = useAppSelector(state => state.sqlEditor.tabs.find(tab => tab.id === tabId)?.target);
  const theme = useGridTheme();

  const { data, loading } = useQuery(
    SourceFieldConstraintsDocument,
    target != null ? { variables: { ref: target } } : skipToken,
  );

  const colDefs = useMemo<ColDef[]>(() => [
    { field: "name", headerName: t("colName"), cellStyle: { fontFamily: "monospace" }, filter: true, floatingFilter: true, sortable: true, resizable: true },
    { field: "type", headerName: t("colType"), sortable: true, resizable: true },
    { field: "nullable", headerName: t("colNullable"), sortable: true, resizable: true },
    { field: "default", headerName: t("colDefault"), sortable: true, resizable: true },
    { field: "key", headerName: t("colKey"), sortable: true, resizable: true },
  ], [t]);

  const rowData = useMemo(() => {
    const keyLabel = (col: ColumnEntry): string => {
      if (col.Primary) return t("keyPrimary");
      if (col.ForeignKey != null) return `${t("keyForeign")} → ${col.ForeignKey.Table}.${col.ForeignKey.Column}`;
      if (col.Unique) return t("keyUnique");
      return "";
    };
    return (data?.SourceFieldConstraints ?? []).map(col => ({
      name: col.Name,
      type: col.Type,
      nullable: col.Nullable === true ? t("yes") : t("no"),
      default: col.DefaultValue ?? "",
      key: keyLabel(col),
    }));
  }, [data?.SourceFieldConstraints, t]);

  return (
    <div className="h-full" data-testid="sql-editor-structure-tab">
      <AgGridReact
        theme={theme}
        columnDefs={colDefs}
        rowData={rowData}
        loading={loading}
        rowHeight={36}
        autoSizeStrategy={{ type: "fitCellContents" }}
      />
    </div>
  );
};
