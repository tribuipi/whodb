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

import { test } from '../../support/test-fixture.mjs';

// The per-cell query-history feature was removed when the multi-cell scratchpad
// was replaced by the full-screen, tabbed SQL editor. The new editor has no
// query history surface, so there is nothing to exercise here. The cases that
// covered storing/cloning/copying/re-executing from history have been removed.
// If query history returns to the SQL editor, restore coverage against its new
// testids here.
test.describe('Query History', () => {
    test.skip('per-cell query history removed with the multi-cell scratchpad', () => {});
});
