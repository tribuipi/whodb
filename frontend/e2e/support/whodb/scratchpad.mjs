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

import {expect} from "@playwright/test";
import {TIMEOUT} from "../helpers/test-utils.mjs";

/**
 * Extract text from an element, converting HTML to plain text
 * @param {import("@playwright/test").Locator} locator
 * @returns {Promise<string>}
 */
async function extractText(locator) {
    const html = await locator.innerHTML();
    return html
        .replace(/<br\s*\/?>/g, "\n")
        .replace(/<\/(p|div|li|h[1-6])>/g, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/<[^>]*>/g, "")
        .trim();
}

/**
 * Methods for the tabbed SQL editor (full-screen scratchpad).
 *
 * The legacy multi-cell scratchpad was replaced by a three-panel SQL editor:
 * a DB object tree on the left, a tab strip in the center, and a per-tab editor
 * with results below it. The result-reading testids (`cell-query-output`,
 * `cell-action-output`) are preserved from the old `QueryView`/`StorageUnitTable`.
 */
export const scratchpadMethods = {
    /**
     * Wait for the SQL editor layout to be ready (call after goto('scratchpad')).
     */
    async waitForSqlEditor() {
        await this.page.locator('[data-testid="sql-editor-layout"]').waitFor({ timeout: TIMEOUT.SLOW });
        await this.page.locator('[data-testid="sql-editor-sql-tab"] .cm-content').first().waitFor({ timeout: TIMEOUT.ACTION });
    },

    /**
     * Write SQL into the active SQL tab's CodeMirror editor.
     * @param {string} text
     */
    async writeCode(text) {
        const editor = this.page.locator('[data-testid="sql-editor-sql-tab"] .cm-content').first();
        await editor.scrollIntoViewIfNeeded();
        await editor.waitFor({ state: "visible" });
        await editor.click();
        await editor.clear();
        await editor.fill(text);
        await expect(editor).toContainText(text);
        await editor.blur();
    },

    /**
     * Read the current text of the active SQL tab's CodeMirror editor.
     * @returns {Promise<string>}
     */
    async getEditorText() {
        const editor = this.page.locator('[data-testid="sql-editor-sql-tab"] .cm-content').first();
        return (await editor.innerText()).trim();
    },

    /**
     * Run the SQL in the active tab via the Run button, clicking through any
     * destructive-query confirmation dialog.
     */
    async runCode() {
        await this.page.locator('[data-testid="sql-editor-run"]').click();

        const confirmBtn = this.page.locator('[data-testid="execute-query-confirm"]');
        if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
            await confirmBtn.click();
        }

        await this.page
            .locator('[data-testid="cell-query-output"], [data-testid="cell-action-output"], [data-testid="error-state"]')
            .first()
            .waitFor({ timeout: TIMEOUT.SLOW });
    },

    /**
     * Format the SQL in the active tab.
     */
    async formatCode() {
        await this.page.locator('[data-testid="sql-editor-format"]').click();
    },

    /**
     * Get the active tab's query output as {columns, rows}.
     * @returns {Promise<{columns: string[], rows: string[][]}>}
     */
    async getCellQueryOutput() {
        const tableLocator = this.page.locator('[data-testid="cell-query-output"] table');
        await tableLocator.waitFor({ timeout: TIMEOUT.ACTION });

        return await tableLocator.evaluate((table) => {
            const columns = Array.from(table.querySelectorAll("th")).map((el) => el.innerText.trim());
            const rows = Array.from(table.querySelectorAll("tbody tr")).map((row) => {
                return Array.from(row.querySelectorAll("td")).map((cell) => cell.innerText.trim());
            });
            return { columns, rows };
        });
    },

    /**
     * Get the active tab's inline error text, or null if no error is shown.
     * @returns {Promise<string|null>}
     */
    async getCellError() {
        const errorLocator = this.page.locator('[data-testid="cell-error"]');
        if (!(await errorLocator.isVisible({ timeout: TIMEOUT.ACTION }).catch(() => false))) {
            return null;
        }
        return (await errorLocator.innerText()).trim();
    },

    /**
     * Get the active tab's action output text (e.g. "Action Executed").
     * @returns {Promise<string>}
     */
    async getCellActionOutput() {
        const el = this.page.locator('[data-testid="cell-action-output"]');
        await el.waitFor({ timeout: TIMEOUT.ACTION });
        return await extractText(el);
    },

    /**
     * Single-click a DB object in the tree, opening a new SELECT tab for it.
     * @param {string} name
     */
    async clickTreeObject(name) {
        await this.page.locator(`[data-testid="sql-editor-tree-object-${name}"]`).click();
    },

    /**
     * Double-click a DB object in the tree, opening its structure tab.
     * @param {string} name
     */
    async openStructure(name) {
        await this.page.locator(`[data-testid="sql-editor-tree-object-${name}"]`).dblclick();
        await this.page.locator('[data-testid="sql-editor-structure-tab"]').waitFor({ timeout: TIMEOUT.ACTION });
    },

    /**
     * Search the object tree.
     * @param {string} term
     */
    async searchTree(term) {
        await this.page.locator('[data-testid="sql-editor-tree-search"]').fill(term);
    },

    /**
     * Add a new SQL tab via the add-tab button.
     */
    async addTab() {
        await this.page.locator('[data-testid="sql-editor-add-tab"]').click();
    },

    /**
     * Get the visible tab names.
     * @returns {Promise<string[]>}
     */
    async getTabNames() {
        const els = this.page.locator('[data-testid="sql-editor-tabs"] [data-testid^="sql-editor-tab-"]');
        const count = await els.count();
        const result = [];
        for (let i = 0; i < count; i++) {
            const text = (await els.nth(i).innerText()).trim();
            if (text.length > 0) {
                result.push(text);
            }
        }
        return result;
    },
};
