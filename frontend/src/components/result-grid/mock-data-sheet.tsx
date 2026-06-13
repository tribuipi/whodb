import { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useLazyQuery } from '@apollo/client/react';
import {
    GenerateMockDataDocument,
    AnalyzeMockDataDependenciesDocument,
    MockDataMaxRowCountDocument,
    type SourceObjectRefInput,
} from '@graphql';
import { toast } from 'sonner';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetFooter, SheetTitle } from '@/components/ui/sheet';
import { Spinner } from '@/components/ui/spinner';
import { CalculatorIcon, XMarkIcon } from '../heroicons';
import { useSourceContract } from '@/hooks/useSourceContract';
import { useTranslation } from '@/hooks/use-translation';

export interface MockDataSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    objectRef: SourceObjectRefInput;
    storageUnit?: string;
    databaseType?: string;
    /** Called after a successful generation so the host can refresh. */
    onGenerated: () => void;
}

/**
 * Sheet panel for generating mock data for a storage unit.
 * Owns all mock-data state, the queries/mutation, and the form JSX.
 */
export function MockDataSheet(props: MockDataSheetProps) {
    const { t } = useTranslation('components/table');
    const { supportsMockDataRelations } = useSourceContract(props.databaseType);

    const [mockDataRowCount, setMockDataRowCount] = useState("100");
    const [mockDataMethod, setMockDataMethod] = useState("Normal");
    const [mockDataOverwriteExisting, setMockDataOverwriteExisting] = useState("append");
    const [mockDataFkDensityRatio, setMockDataFkDensityRatio] = useState("20");
    const [showMockDataConfirmation, setShowMockDataConfirmation] = useState(false);

    const { data: maxRowData } = useQuery(MockDataMaxRowCountDocument);
    const maxRowCount = maxRowData?.MockDataMaxRowCount ?? 200;

    const [generateMockData, { loading: generatingMockData }] = useMutation(GenerateMockDataDocument);
    const [runAnalyzeDependencies, { data: depAnalysis, loading: analyzingDeps }] = useLazyQuery(AnalyzeMockDataDependenciesDocument);

    const handleMockDataRowCountChange = useCallback((value: string) => {
        const numericValue = value.replace(/[^0-9]/g, '');
        const parsedValue = parseInt(numericValue) || 0;
        if (parsedValue > maxRowCount) {
            setMockDataRowCount(maxRowCount.toString());
            toast.error(t('maximumRowCount', { max: maxRowCount }));
        } else {
            setMockDataRowCount(numericValue);
        }
    }, [maxRowCount, t]);

    const handleMockDataGenerate = useCallback(async () => {
        if (!props.storageUnit || !props.objectRef) {
            toast.error(t('storageUnitRequired'));
            return;
        }

        if (mockDataOverwriteExisting === "overwrite" && !showMockDataConfirmation) {
            setShowMockDataConfirmation(true);
            return;
        }

        const count = parseInt(mockDataRowCount);

        if (isNaN(count) || count < 1) {
            toast.error(t('rowCountMustBePositive'));
            return;
        }

        if (count > maxRowCount) {
            toast.error(t('rowCountExceedsMax', { max: maxRowCount }));
            return;
        }

        try {
            const result = await generateMockData({
                variables: {
                    input: {
                        Ref: props.objectRef,
                        RowCount: count,
                        Method: mockDataMethod,
                        OverwriteExisting: mockDataOverwriteExisting === "overwrite",
                        FkDensityRatio: parseInt(mockDataFkDensityRatio) || 20,
                    }
                }
            });

            const data = result.data?.GenerateMockData;
            if (data?.AmountGenerated) {
                toast.success(t('successfullyGenerated', { count: data.AmountGenerated }));
                setShowMockDataConfirmation(false);
                props.onOpenChange(false);
                props.onGenerated();
            } else {
                toast.error(t('failedToMockData'));
            }
        } catch (error: any) {
            if (error.message === "mock data generation is not allowed for this table") {
                toast.error(t('mockDataNotAllowed'));
            } else {
                toast.error(t('mockDataFailed', { message: error.message }));
            }
        }
    }, [generateMockData, maxRowCount, mockDataFkDensityRatio, mockDataMethod, mockDataOverwriteExisting, mockDataRowCount, props, showMockDataConfirmation, t]);

    useEffect(() => {
        if (props.open && props.objectRef) {
            const rowCount = parseInt(mockDataRowCount) || 100;
            if (rowCount > 0 && rowCount <= maxRowCount) {
                void runAnalyzeDependencies({
                    variables: {
                        ref: props.objectRef,
                        rowCount,
                        fkDensityRatio: null,
                    },
                });
            }
        }
    }, [runAnalyzeDependencies, maxRowCount, mockDataRowCount, props.objectRef, props.open]);

    const adjustedDepAnalysis = useMemo(() => {
        const analysis = depAnalysis?.AnalyzeMockDataDependencies;
        if (!analysis || analysis.Error || !analysis.Tables || analysis.Tables.length <= 1) {
            return analysis;
        }

        const ratio = parseInt(mockDataFkDensityRatio) || 20;
        const requestedRows = parseInt(mockDataRowCount) || 100;
        const recalculated = analysis.Tables.map((tbl) => ({ ...tbl }));

        let childRowCount = requestedRows;
        for (let i = recalculated.length - 1; i >= 0; i--) {
            if (i === recalculated.length - 1) {
                recalculated[i] = { ...recalculated[i], RowsToGenerate: requestedRows };
            } else {
                const parentRows = Math.max(1, Math.floor(childRowCount / ratio));
                recalculated[i] = { ...recalculated[i], RowsToGenerate: parentRows };
                childRowCount = parentRows;
            }
        }

        const totalRows = recalculated.reduce((sum, tbl) => sum + tbl.RowsToGenerate, 0);

        return {
            ...analysis,
            Tables: recalculated,
            TotalRows: totalRows,
        };
    }, [depAnalysis, mockDataFkDensityRatio, mockDataRowCount]);

    return (
        <Sheet open={props.open} onOpenChange={(open) => {
            props.onOpenChange(open);
            if (!open) {
                setShowMockDataConfirmation(false);
            }
        }}>
            <SheetContent side="right" className="flex flex-col p-8" data-testid="mock-data-sheet">
                <div className="flex flex-col gap-lg flex-1 overflow-y-auto">
                    <SheetTitle className="flex items-center gap-2"><CalculatorIcon className="w-4 h-4" /> {t('mockData')}</SheetTitle>
                    {!showMockDataConfirmation ? (
                        <div className="space-y-4">
                            <Label>{t('numberOfRows', { max: maxRowCount })}</Label>
                            <Input
                                value={mockDataRowCount}
                                onChange={e => { handleMockDataRowCountChange(e.target.value); }}
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                max={maxRowCount.toString()}
                                placeholder={t('enterNumberOfRows', { max: maxRowCount })}
                                data-testid="mock-data-rows-input"
                            />
                            <Label>{t('method')}</Label>
                            <Select value={mockDataMethod} onValueChange={(v) => { if (v != null) setMockDataMethod(v); }}>
                                <SelectTrigger className="w-full" data-testid="mock-data-method-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Normal" data-value="Normal">{t('methodNormal')}</SelectItem>
                                </SelectContent>
                            </Select>
                            <Label>{t('dataHandling')}</Label>
                            <Select value={mockDataOverwriteExisting} onValueChange={(v) => { if (v != null) setMockDataOverwriteExisting(v); }}>
                                <SelectTrigger className="w-full" data-testid="mock-data-handling-select">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="append" data-value="append">{t('appendToExisting')}</SelectItem>
                                    <SelectItem value="overwrite" data-value="overwrite">{t('overwriteExisting')}</SelectItem>
                                </SelectContent>
                            </Select>
                            {supportsMockDataRelations && (
                                <>
                                    <div>
                                        <Label>{t('fkVariety')}</Label>
                                        <p className="text-sm text-muted-foreground mb-2">{t('fkVarietyDescription')}</p>
                                    </div>
                                    <Select value={mockDataFkDensityRatio} onValueChange={(v) => { if (v != null) setMockDataFkDensityRatio(v); }}>
                                        <SelectTrigger className="w-full" data-testid="mock-data-fk-variety-select">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="5" data-value="5">{t('fkVarietyHigh')}</SelectItem>
                                            <SelectItem value="10" data-value="10">{t('fkVarietyMedium')}</SelectItem>
                                            <SelectItem value="20" data-value="20">{t('fkVarietyNormal')}</SelectItem>
                                            <SelectItem value="50" data-value="50">{t('fkVarietyLow')}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </>
                            )}
                            {adjustedDepAnalysis?.Error && (
                                <Alert variant="destructive" className="mt-4">
                                    <AlertTitle>{t('dependencyError')}</AlertTitle>
                                    <AlertDescription>
                                        {adjustedDepAnalysis.Error}
                                    </AlertDescription>
                                </Alert>
                            )}
                            {adjustedDepAnalysis && !adjustedDepAnalysis.Error && adjustedDepAnalysis.Tables && adjustedDepAnalysis.Tables.length > 1 && (
                                <div className="mt-4 p-3 border rounded-md bg-muted/50">
                                    <p className="text-sm font-medium mb-2">{t('tablesToPopulate')}</p>
                                    <ul className="text-sm space-y-1">
                                        {adjustedDepAnalysis.Tables.map((tbl) => (
                                            <li key={tbl.Table} className="flex items-center gap-2">
                                                <span className="font-mono">{tbl.Table}</span>
                                                <span className="text-muted-foreground">
                                                    ({tbl.RowsToGenerate} {t('rows')})
                                                </span>
                                                {tbl.UsesExistingData && (
                                                    <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                                                        {t('usingExisting')}
                                                    </span>
                                                )}
                                            </li>
                                        ))}
                                    </ul>
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {t('totalRows', { count: adjustedDepAnalysis.TotalRows })}
                                    </p>
                                </div>
                            )}
                            {analyzingDeps && (
                                <div className="mt-4 flex justify-center">
                                    <Spinner />
                                </div>
                            )}
                            {generatingMockData && (
                                <div className="mt-8 flex justify-center">
                                    <Spinner />
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex items-center justify-center mb-4">
                                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900 rounded-full flex items-center justify-center">
                                    <XMarkIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
                                </div>
                            </div>
                            <p className="text-center text-gray-700 dark:text-gray-300">
                                {t('overwriteConfirmation', { storageUnit: props.storageUnit })}
                            </p>
                        </div>
                    )}
                </div>
                <SheetFooter className="flex gap-sm px-0 mt-4 border-t pt-4">
                    <Alert variant="default" className="mb-4 flex-1">
                        <AlertTitle>{t('mockDataNote')}</AlertTitle>
                        <AlertDescription>
                            {supportsMockDataRelations ? t('mockDataWarning') : t('mockDataWarningClickHouse')}
                        </AlertDescription>
                    </Alert>
                </SheetFooter>
                <div className="flex gap-sm mt-4">
                    <Button
                        className="flex-1"
                        variant="secondary"
                        onClick={() => { props.onOpenChange(false); }}
                        data-testid="cancel-mock-data"
                    >
                        {t('cancel')}
                    </Button>
                    {!showMockDataConfirmation ? (
                        <Button className="flex-1" onClick={() => { void handleMockDataGenerate(); }} disabled={generatingMockData || !mockDataRowCount || parseInt(mockDataRowCount) < 1} data-testid="mock-data-generate-button">
                            {t('generate')}
                        </Button>
                    ) : (
                        <Button className="flex-1" onClick={() => { void handleMockDataGenerate(); }} disabled={generatingMockData || !mockDataRowCount || parseInt(mockDataRowCount) < 1} variant="destructive" data-testid="mock-data-overwrite-button">
                            {t('yesOverwrite')}
                        </Button>
                    )}
                </div>
            </SheetContent>
        </Sheet>
    );
}
