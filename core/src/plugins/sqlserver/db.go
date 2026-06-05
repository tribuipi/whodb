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
	"fmt"
	"net"
	"net/url"
	"strconv"

	"gorm.io/driver/sqlserver"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/clidey/whodb/core/src/common/ssl"
	"github.com/clidey/whodb/core/src/engine"
	"github.com/clidey/whodb/core/src/log"
	"github.com/clidey/whodb/core/src/plugins"
)

// DB opens a GORM connection to SQL Server using the provided plugin config.
func (p *SQLServerPlugin) DB(config *engine.PluginConfig) (*gorm.DB, error) {
	connectionInput, err := p.ParseConnectionConfig(config)
	if err != nil {
		return nil, err
	}

	query := url.Values{}
	query.Set("database", connectionInput.Database)

	// Map SSL mode to SQL Server driver parameters.
	// SQL Server uses "encrypt" and "TrustServerCertificate" URL params.
	if connectionInput.SSLConfig == nil || !connectionInput.SSLConfig.IsEnabled() {
		query.Set("encrypt", "disable")
	} else {
		switch connectionInput.SSLConfig.Mode {
		case ssl.SSLModeRequired:
			query.Set("encrypt", "true")
			query.Set("TrustServerCertificate", "true")
		case ssl.SSLModeVerifyIdentity, ssl.SSLModeVerifyCA:
			query.Set("encrypt", "true")
			query.Set("TrustServerCertificate", "false")
		default:
			query.Set("encrypt", "disable")
		}
	}

	u := &url.URL{
		Scheme:   "sqlserver",
		User:     url.UserPassword(connectionInput.Username, connectionInput.Password),
		Host:     net.JoinHostPort(connectionInput.Hostname, strconv.Itoa(connectionInput.Port)),
		RawQuery: query.Encode(),
	}
	dsn := u.String()

	l := log.WithFields(map[string]any{
		"hostname": connectionInput.Hostname,
		"port":     connectionInput.Port,
		"database": connectionInput.Database,
		"username": connectionInput.Username,
	})

	db, err := gorm.Open(sqlserver.Open(dsn), &gorm.Config{Logger: logger.Default.LogMode(plugins.GetGormLogConfig())})
	if err != nil {
		l.WithError(err).Error("Failed to connect to SQL Server database")
		return nil, fmt.Errorf("sqlserver: %w", err)
	}

	if err := plugins.ConfigureConnectionPool(db); err != nil {
		l.WithError(err).Warn("Failed to configure connection pool")
	}

	return db, nil
}
