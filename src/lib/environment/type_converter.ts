/*
   Copyright 2022 Nikita Petko <petko@vmminfra.net>

   Licensed under the Apache License, Version 2.0 (the "License");
   you may not use this file except in compliance with the License.
   You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/

/*
    File Name: type_converters.ts
    Description: A simple helper that converts the given value to the given type.
    Written by: Nikita Petko
*/

/**
 * A simple helper that converts the given value to the given type.
 */
export default abstract class TypeConverters {
  /**
   * Converts the given value to a boolean.
   *
   * @example
   * ```typescript
   * Convert.ToBoolean(true); // true
   * Convert.ToBoolean(false); // false
   * Convert.ToBoolean(1); // true
   * Convert.ToBoolean(0); // false
   * Convert.ToBoolean('true'); // true
   * Convert.ToBoolean('false'); // false
   * Convert.ToBoolean('1'); // true
   * Convert.ToBoolean('0'); // false
   * ```
   * @param {unknown} value The value to be converted.
   * @param {boolean} defaultValue The default value to be returned if the given value cannot be converted to a boolean.
   * @returns {boolean} The converted value.
   */
  public static toBoolean(value: unknown, defaultValue?: boolean): boolean {
    if (typeof value === 'boolean') return value;

    const valueAsNumber = parseInt(value as string, 10);

    if (!isNaN(valueAsNumber)) {
      return valueAsNumber > 0;
    }

    const defaultReturn = defaultValue !== undefined && defaultValue !== null ? defaultValue : false;
    value = typeof value === 'string' ? value.toLowerCase() : null;
    if (value === null) return defaultReturn;
    try {
      return JSON.parse(value as string);
    } catch {
      return defaultReturn;
    }
  }
}
