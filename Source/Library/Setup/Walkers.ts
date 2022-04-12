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
    File Name: Walkers.ts
    Description: A simple helper that recursively walks through the directory structure.
    Written by: Nikita Petko
*/

import { join } from 'path';
import { readdirSync, statSync } from 'fs';

/**
 * A simple helper that recursively walks through the directory structure.
 */
export abstract class Walkers {
    /**
     * Recursively walks through the directory structure.
     * @param {string} directoryName The directory to walk through.
     * @param {string[]} paths The paths to be returned. This parameter is only used internally when recursively walking through the directory structure.
     * @returns {string[]} The paths to the files in the directory.
     */
    public static WalkDirectory(directoryName: string, paths?: string[]): string[] {
        const directory = readdirSync(directoryName);
        paths = paths || [];

        directory.forEach((directoryOrFile) => {
            const directoryNameV2 = directoryName + '/' + directoryOrFile;
            if (statSync(directoryNameV2).isDirectory()) {
                paths = Walkers.WalkDirectory(directoryNameV2, paths);
            } else {
                paths.push(join(directoryName, '/', directoryOrFile));
            }
        });

        return paths;
    }
}
