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

package sqlserver

import (
	"gorm.io/gorm"

	"github.com/clidey/whodb/core/src/common/ssl"
	"github.com/clidey/whodb/core/src/engine"
	"github.com/clidey/whodb/core/src/plugins"
)

// GetSSLStatus queries SQL Server to get the actual encryption status of the connection.
// Uses sys.dm_exec_connections. Results are cached.
func (p *SQLServerPlugin) GetSSLStatus(config *engine.PluginConfig) (*engine.SSLStatus, error) {
	if cached := plugins.GetCachedSSLStatus(config); cached != nil {
		return cached, nil
	}

	status, err := plugins.WithConnection(config, p.DB, func(db *gorm.DB) (*engine.SSLStatus, error) {
		var result struct {
			EncryptOption string `gorm:"column:encrypt_option"`
		}

		if err := db.Raw("SELECT encrypt_option FROM sys.dm_exec_connections WHERE session_id = @@SPID").Scan(&result).Error; err != nil {
			return nil, err
		}

		if result.EncryptOption != "TRUE" {
			return &engine.SSLStatus{
				IsEnabled: false,
				Mode:      string(ssl.SSLModeDisabled),
			}, nil
		}

		sslConfig := ssl.ParseSSLConfig(p.Type, config.Credentials.Advanced, config.Credentials.Hostname, config.Credentials.IsProfile)
		mode := "enabled"
		if sslConfig != nil {
			mode = string(sslConfig.Mode)
		}

		return &engine.SSLStatus{
			IsEnabled: true,
			Mode:      mode,
		}, nil
	})

	if err == nil && status != nil {
		plugins.SetCachedSSLStatus(config, status)
	}
	return status, err
}
