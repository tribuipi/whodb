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

import { test, expect, forEachDatabase, conditionalTest } from '../../support/test-fixture.mjs';
import { hasFeature, getSqlQuery } from '../../support/database-config.mjs';

test.describe('SQL Editor', () => {

    // SQL Databases only
    forEachDatabase('sql', (db) => {
        test.describe('Query Execution', () => {
            // Get expected column names from config
            const expectedIdentifierCol = db.testTable.identifierField;
            const expectedCountCol = db.sql.countColumn;
            const expectedUpdatedValue = db.testTable.testValues.modified;

            test('executes SELECT query and shows results', async ({ whodb }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                const query = getSqlQuery(db, 'selectAllUsers');
                await whodb.writeCode(query);
                await whodb.runCode();

                const { columns, rows } = await whodb.getCellQueryOutput();
                expect(columns.map(c => c.toUpperCase())).toContain(expectedIdentifierCol.toUpperCase());
                expect(rows.length).toBeGreaterThan(0);
            });

            test('executes filtered query', async ({ whodb }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                const query = getSqlQuery(db, 'selectUserById');
                await whodb.writeCode(query);
                await whodb.runCode();

                const { rows } = await whodb.getCellQueryOutput();
                expect(rows.length).toEqual(1);
            });

            test('executes aggregate query', async ({ whodb }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                const query = getSqlQuery(db, 'countUsers');
                await whodb.writeCode(query);
                await whodb.runCode();

                const { columns, rows } = await whodb.getCellQueryOutput();
                expect(columns.map(c => c.toUpperCase())).toContain(expectedCountCol.toUpperCase());
                expect(rows.length).toEqual(1);
            });

            // Skip UPDATE test for databases with async mutations (e.g., ClickHouse)
            const updateSupported = hasFeature(db, 'scratchpadUpdate') !== false;

            conditionalTest(updateSupported, 'executes UPDATE then verifies and reverts', async ({ whodb, page }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                const mutationDelay = db.mutationDelay || 0;

                await test.step('execute update', async () => {
                    const updateQuery = getSqlQuery(db, 'updateUser');
                    await whodb.writeCode(updateQuery);
                    await whodb.runCode();

                    const actionOutput = await whodb.getCellActionOutput();
                    expect(actionOutput).toContain('Action Executed');

                    // Wait for async mutations (e.g., ClickHouse)
                    if (mutationDelay > 0) {
                        await page.waitForTimeout(mutationDelay);
                    }
                });

                await test.step('verify update', async () => {
                    const selectQuery = getSqlQuery(db, 'selectUserById');
                    await whodb.writeCode(selectQuery);
                    await whodb.runCode();

                    const { rows } = await whodb.getCellQueryOutput();
                    expect(rows[0]).toContain(expectedUpdatedValue);
                });

                await test.step('revert update', async () => {
                    const revertQuery = getSqlQuery(db, 'revertUser');
                    await whodb.writeCode(revertQuery);
                    await whodb.runCode();

                    const revertOutput = await whodb.getCellActionOutput();
                    expect(revertOutput).toContain('Action Executed');
                });
            });
        });

        test.describe('Editor Tools', () => {
            test('formats SQL in the editor', async ({ whodb }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                // Messy, single-line SQL that the formatter should reflow.
                await whodb.writeCode('select   1   as   a');
                await whodb.formatCode();

                const formatted = await whodb.getEditorText();
                // The formatter normalizes keyword casing and whitespace.
                expect(formatted.toUpperCase()).toContain('SELECT');
                // Collapsed runs of spaces should be gone.
                expect(formatted).not.toContain('   ');
            });
        });

        test.describe('Object Tree', () => {
            const tableName = db.testTable.name;
            const expectedIdentifierCol = db.testTable.identifierField;

            test('single-click opens a SELECT tab for the object', async ({ whodb, page }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                await whodb.clickTreeObject(tableName);

                // A new tab named after the object opens.
                await expect(page.locator(`[data-testid="sql-editor-tab-${tableName}"]`)).toBeVisible();

                // Its editor is pre-filled with a SELECT for that object.
                const editorText = await whodb.getEditorText();
                expect(editorText.toUpperCase()).toContain('SELECT');
                expect(editorText).toContain(tableName);

                // And it runs successfully.
                await whodb.runCode();
                const { rows } = await whodb.getCellQueryOutput();
                expect(rows.length).toBeGreaterThan(0);
            });

            test('double-click opens a structure tab listing columns', async ({ whodb, page }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                await whodb.openStructure(tableName);

                const structure = page.locator('[data-testid="sql-editor-structure-tab"]');
                await expect(structure).toBeVisible();
                await expect(structure.locator('tbody tr')).not.toHaveCount(0);
                await expect(structure).toContainText(expectedIdentifierCol);
            });
        });

        test.describe('Tab Management', () => {
            test('adds a new SQL tab', async ({ whodb, page }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                const before = await whodb.getTabNames();
                expect(before).toContain('SQL 1');

                await whodb.addTab();

                await expect(page.locator('[data-testid="sql-editor-tab-SQL 2"]')).toBeVisible();
                const after = await whodb.getTabNames();
                expect(after.length).toEqual(before.length + 1);
            });
        });

        test.describe('Query Export', () => {
            test('exports query results as CSV', async ({ whodb, page }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                let exportPromise;
                await test.step('execute query', async () => {
                    exportPromise = page.waitForResponse(resp =>
                        resp.url().includes('/api/export') && resp.request().method() === 'POST'
                    );

                    const query = getSqlQuery(db, 'selectAllUsers');
                    await whodb.writeCode(query);
                    await whodb.runCode();

                    const { rows } = await whodb.getCellQueryOutput();
                    expect(rows.length).toBeGreaterThan(0);
                });

                await test.step('open export dialog', async () => {
                    await page.locator('[data-testid="cell-query-output"] [data-testid="export-all-button"]').click();
                    await expect(page.locator('h2').filter({ hasText: 'Export Data' }).first()).toBeVisible();

                    // Verify the raw query export message
                    await expect(page.locator('text=You are about to export the results of your query.')).toBeVisible();

                    // Verify CSV is selected by default
                    await expect(page.locator('[data-testid="export-format-select"]')).toContainText('CSV');
                });

                await test.step('verify and export', async () => {
                    await whodb.confirmExport();

                    const response = await exportPromise;
                    expect(response.status()).toEqual(200);
                    const request = response.request();
                    const postData = JSON.parse(request.postData());
                    expect(postData.selectedRows).toBeDefined();
                    expect(Array.isArray(postData.selectedRows)).toBe(true);
                    expect(postData.selectedRows.length).toBeGreaterThan(0);
                    expect(postData.fileBaseName).toEqual('query_export');
                });
            });

            test('exports query results as Excel', async ({ whodb, page }) => {
                await whodb.goto('scratchpad');
                await whodb.waitForSqlEditor();

                let exportPromise;
                await test.step('execute query', async () => {
                    exportPromise = page.waitForResponse(resp =>
                        resp.url().includes('/api/export') && resp.request().method() === 'POST'
                    );

                    const query = getSqlQuery(db, 'selectAllUsers');
                    await whodb.writeCode(query);
                    await whodb.runCode();

                    const { rows } = await whodb.getCellQueryOutput();
                    expect(rows.length).toBeGreaterThan(0);
                });

                await test.step('open export and select format', async () => {
                    await page.locator('[data-testid="cell-query-output"] [data-testid="export-all-button"]').click();
                    await whodb.selectExportFormat('excel');
                });

                await test.step('verify export', async () => {
                    await whodb.confirmExport();

                    const response = await exportPromise;
                    expect(response.status()).toEqual(200);
                    const request = response.request();
                    const postData = JSON.parse(request.postData());
                    expect(postData.selectedRows).toBeDefined();
                    expect(postData.format).toEqual('excel');
                    expect(postData.fileBaseName).toEqual('query_export');
                });
            });
        });

        test.describe('Embedded Scratchpad Drawer', () => {
            const testTable = db.testTable;
            const tableName = testTable.name;

            test('opens from data view and runs query', async ({ whodb, page }) => {
                await test.step('navigate to data view', async () => {
                    await whodb.data(tableName);
                });

                await test.step('open embedded scratchpad', async () => {
                    await page.locator('[data-testid="embedded-scratchpad-button"]').click();
                    await expect(page.locator('[data-slot="drawer-title"]').first()).toBeVisible();

                    // Verify default query is populated
                    await expect(page.locator('[data-testid="code-editor"]')).toBeAttached();
                    const schemaPrefix = db.sql.schemaPrefix;
                    await expect(page.locator('[data-testid="code-editor"]')).toContainText('SELECT');
                    await expect(page.locator('[data-testid="code-editor"]')).toContainText(`FROM ${schemaPrefix}${tableName}`);
                });

                await test.step('execute and verify', async () => {
                    if (db.sql.limitQuery) {
                        const editor = page.locator('[role="dialog"] [data-testid="code-editor"] .cm-content').first();
                        await editor.click();
                        await editor.clear();
                        await editor.fill(db.sql.limitQuery);
                        await expect(editor).toContainText(db.sql.limitQuery);
                        await editor.blur();
                    }

                    await page.locator('[data-testid="run-submit-button"]').filter({ hasText: 'Run' }).first().click();

                    await expect(page.locator('[role="dialog"] table')).toBeVisible({ timeout: 5000 });
                    const rowCount = await page.locator('[role="dialog"] table tbody tr').count();
                    expect(rowCount).toBeGreaterThanOrEqual(1);

                    await page.keyboard.press('Escape');
                    await expect(page.locator('[data-testid="table-search"]')).toBeVisible();
                });
            });
        });
    }, { features: ['scratchpad'] });

});
