import type React from "react";
import {
    CalculatorIcon,
    CalendarIcon,
    CheckCircleIcon,
    CircleStackIcon,
    ClockIcon,
    CodeBracketIcon,
    DocumentDuplicateIcon,
    DocumentTextIcon,
    GlobeAltIcon,
    HashtagIcon,
    KeyIcon,
    ListBulletIcon,
    Squares2X2Icon,
} from "../heroicons";

// Type sets for icon mapping
// Includes both canonical forms and common aliases for broad matching
const stringTypes = new Set([
    "TEXT", "STRING", "VARCHAR", "CHAR",
    "CHARACTER VARYING", "CHARACTER",
    "FIXEDSTRING",
]);
const intTypes = new Set([
    "INTEGER", "SMALLINT", "BIGINT", "INT", "TINYINT", "MEDIUMINT",
    "INT2", "INT4", "INT8",
    "INT16", "INT32", "INT64", "INT128", "INT256",
    "SERIAL", "BIGSERIAL", "SMALLSERIAL",
]);
const uintTypes = new Set([
    "TINYINT UNSIGNED", "SMALLINT UNSIGNED", "MEDIUMINT UNSIGNED", "BIGINT UNSIGNED",
    "UINT8", "UINT16", "UINT32", "UINT64", "UINT128", "UINT256",
]);
const floatTypes = new Set([
    "REAL", "NUMERIC", "DOUBLE PRECISION", "FLOAT", "NUMBER", "DOUBLE", "DECIMAL",
    "FLOAT4", "FLOAT8",
    "FLOAT32", "FLOAT64",
    "DECIMAL32", "DECIMAL64", "DECIMAL128", "DECIMAL256",
    "MONEY",
]);
const boolTypes = new Set([
    "BOOLEAN", "BIT", "BOOL",
]);
const dateTypes = new Set([
    "DATE",
    "DATE32",
]);
const dateTimeTypes = new Set([
    "DATETIME", "TIMESTAMP", "TIME",
    "TIMESTAMP WITH TIME ZONE", "TIMESTAMP WITHOUT TIME ZONE",
    "TIME WITH TIME ZONE", "TIME WITHOUT TIME ZONE",
    "DATETIME2", "SMALLDATETIME",
    "TIMETZ", "TIMESTAMPTZ",
    "INTERVAL",
    "DATETIME64",
    "YEAR",
]);
const uuidTypes = new Set([
    "UUID",
]);
const binaryTypes = new Set([
    "BLOB", "BYTEA", "VARBINARY", "BINARY", "IMAGE",
    "TINYBLOB", "MEDIUMBLOB", "LONGBLOB",
]);
const jsonTypes = new Set([
    "JSON", "JSONB",
]);
const networkTypes = new Set([
    "CIDR", "INET", "MACADDR", "MACADDR8",
    "IPV4", "IPV6",
]);
const geometryTypes = new Set([
    "POINT", "LINE", "LSEG", "BOX", "PATH", "POLYGON", "CIRCLE",
    "GEOMETRY", "GEOGRAPHY",
    "LINESTRING", "MULTIPOINT", "MULTILINESTRING", "MULTIPOLYGON", "GEOMETRYCOLLECTION",
]);
const xmlTypes = new Set([
    "XML",
]);

/**
 * Strips length/precision suffix from a type string.
 * e.g., "VARCHAR(255)" -> "VARCHAR", "DECIMAL(10,2)" -> "DECIMAL"
 */
function stripTypeSuffix(type: string): string {
    return type.replace(/\(.*\)$/, '').trim();
}

/**
 * Returns a type-appropriate icon element per column, matched by data type name.
 */
export function getColumnIcons(columns: string[], columnTypes?: string[], t?: (key: string) => string) {
    return columns.map((col, idx) => {
        const rawType = columnTypes?.[idx] ?? "";
        const type = stripTypeSuffix(rawType).toUpperCase();
        const key = `${col}-${idx}`;

        if (intTypes.has(type) || uintTypes.has(type)) return <HashtagIcon key={key} className="w-4 h-4" aria-label={t?.('integerType') ?? 'Integer type'} />;
        if (floatTypes.has(type)) return <CalculatorIcon key={key} className="w-4 h-4" aria-label={t?.('decimalType') ?? 'Decimal type'} />;
        if (boolTypes.has(type)) return <CheckCircleIcon key={key} className="w-4 h-4" aria-label={t?.('booleanType') ?? 'Boolean type'} />;
        if (dateTypes.has(type)) return <CalendarIcon key={key} className="w-4 h-4" aria-label={t?.('dateType') ?? 'Date type'} />;
        if (dateTimeTypes.has(type)) return <ClockIcon key={key} className="w-4 h-4" aria-label={t?.('dateTimeType') ?? 'DateTime type'} />;
        if (uuidTypes.has(type)) return <KeyIcon key={key} className="w-4 h-4" aria-label={t?.('uuidType') ?? 'UUID type'} />;
        if (binaryTypes.has(type)) return <DocumentDuplicateIcon key={key} className="w-4 h-4" aria-label={t?.('binaryType') ?? 'Binary type'} />;
        if (jsonTypes.has(type)) return <CodeBracketIcon key={key} className="w-4 h-4" aria-label={t?.('jsonType') ?? 'JSON type'} />;
        if (networkTypes.has(type)) return <GlobeAltIcon key={key} className="w-4 h-4" aria-label={t?.('networkType') ?? 'Network type'} />;
        if (geometryTypes.has(type)) return <Squares2X2Icon key={key} className="w-4 h-4" aria-label={t?.('geometryType') ?? 'Geometry type'} />;
        if (xmlTypes.has(type)) return <CodeBracketIcon key={key} className="w-4 h-4" aria-label={t?.('xmlType') ?? 'XML type'} />;
        if (type.startsWith("ARRAY")) return <ListBulletIcon key={key} className="w-4 h-4" aria-label={t?.('arrayType') ?? 'Array type'} />;
        if (stringTypes.has(type)) return <DocumentTextIcon key={key} className="w-4 h-4" aria-label={t?.('textType') ?? 'Text type'} />;
        return <CircleStackIcon key={key} className="w-4 h-4" aria-label={t?.('dataType') ?? 'Data type'} />;
    });
}

/**
 * Maps column data types to HTML5 input attributes for native validation.
 * Leverages browser-native validation and appropriate input types.
 *
 * @param rawType - The column type string (e.g., "INTEGER", "VARCHAR(255)", "TIMESTAMP")
 * @returns Object with HTML input attributes (type, step, min, inputMode)
 */
export function getInputPropsForColumnType(rawType: string): {
    type?: React.HTMLInputTypeAttribute;
    step?: string;
    min?: string;
    inputMode?: 'text' | 'numeric' | 'decimal',
    onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
} {
    const type = stripTypeSuffix(rawType).toUpperCase();

    // the html5 spec for numbers allows "e" to be used to mean exponent, so 2e2 => 2*10^2 => 200.
    // that requires extra backend handling and databases do not usually show nums like that.
    // so we avoid "e" as well as "+" because if a number doesn't have "-", it's already positive.
    const numOnKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {if (e.key === "e" || e.key === "E" || e.key === "+") e.preventDefault();}

    // Integer types - use number input with step=1
    if (intTypes.has(type)) {
        return { type: 'number', step: '1', inputMode: 'numeric',  onKeyDown: numOnKeyDown};
    }

    // Unsigned integer types - use number input with min=0 and step=1
    if (uintTypes.has(type)) {
        return { type: 'number', step: '1', min: '0', inputMode: 'numeric', onKeyDown: numOnKeyDown };
    }

    // Float/decimal types - use number input with step=any
    if (floatTypes.has(type)) {
        return { type: 'number', step: 'any', inputMode: 'decimal', onKeyDown: numOnKeyDown };
    }

    // Default to text input with text keyboard
    return { type: 'text', inputMode: 'text' };
}
