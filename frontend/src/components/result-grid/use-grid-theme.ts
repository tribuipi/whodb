import { useMemo } from 'react';
import { useTheme } from '@/components/theme/provider';
import { themeQuartz } from 'ag-grid-community';

/**
 * Returns an ag-grid theme (Quartz) whose colour scheme follows WhoDB's
 * resolved light/dark mode, tuned to the surrounding neutral palette.
 */
export function useGridTheme() {
    const { theme } = useTheme();
    const darkModeEnabled =
        theme === 'dark' ||
        (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    return useMemo(() => {
        return themeQuartz.withParams({
            browserColorScheme: darkModeEnabled ? 'dark' : 'light',
            backgroundColor: darkModeEnabled ? '#171717' : '#ffffff',
            foregroundColor: darkModeEnabled ? '#e5e5e5' : '#262626',
            headerBackgroundColor: darkModeEnabled ? '#262626' : '#fafafa',
            borderColor: darkModeEnabled ? '#404040' : '#e5e5e5',
            rowHoverColor: darkModeEnabled ? '#262626' : '#f5f5f5',
            fontFamily: 'inherit',
            fontSize: '13px',
        });
    }, [darkModeEnabled]);
}
