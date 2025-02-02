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
    File Name: index.ts
    Description: A console and file logger.
    Written by: Nikita Petko
*/

/* eslint-disable valid-jsdoc */
/* eslint-disable @typescript-eslint/adjacent-overload-signatures */

////////////////////////////////////////////////////////////////////////////////
// Project imports
////////////////////////////////////////////////////////////////////////////////

import environment from '@lib/environment';
import { projectDirectoryName } from '@lib/directories';

////////////////////////////////////////////////////////////////////////////////
// Type imports
////////////////////////////////////////////////////////////////////////////////

import { LogLevel } from '@lib/logger/log_level';
import { LogColor } from '@lib/logger/log_color';
import {
  nameRegex,
  invalidLogMessage,
  invalidLogMessageType,
  invalidConstructorName,
  invalidSetterBooleanValue,
  invalidSetterLogLevelType,
  invalidConstructorLogLevel,
  invalidConstructorNameType,
  invalidConstructorNameEmpty,
  invalidConstructorNameRegex,
  thisKeywordIncorrectClosure,
  invalidConstructorLogToConsole,
  invalidConstructorCutLogPrefix,
  invalidConstructorLogLevelType,
  invalidConstructorLogToFileSystem,
  setterValueCannotBeUndefinedOrNull,
  invalidConstructorLogToConsoleType,
  invalidConstructorCutLogPrefixType,
  invalidConstructorLogToFileSystemType,
} from '@lib/logger/logger_constants';

////////////////////////////////////////////////////////////////////////////////
// Type exports
////////////////////////////////////////////////////////////////////////////////

export { LogLevel };

////////////////////////////////////////////////////////////////////////////////
// Built-in imports
////////////////////////////////////////////////////////////////////////////////

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

////////////////////////////////////////////////////////////////////////////////
// Third-party imports
////////////////////////////////////////////////////////////////////////////////

import net from '@mfdlabs/net';

Error.stackTraceLimit = Infinity;

/**
 * A simple logger class that will log to the console and to a file.
 *
 * @internal This class is only ingested internally.
 */
export default class Logger {
  //////////////////////////////////////////////////////////////////////////////
  // Private Static Readonly Properties
  //////////////////////////////////////////////////////////////////////////////

  /* Log File Stuff */
  private static _logFileBaseDirectoryBacking: string = undefined;
  private static get _logFileBaseDirectory(): string {
    try {
      if (Logger._logFileBaseDirectoryBacking === undefined) {
        Logger._logFileBaseDirectoryBacking = path.join(projectDirectoryName, 'logs');
      }

      return Logger._logFileBaseDirectoryBacking;
    } catch (error) {
      return path.resolve();
    }
  }

  /* Log String Stuff */
  /**
   * @internal This is a private member.
   */
  private static readonly _localIp: string = net.getLocalIPv4();
  /**
   * @internal This is a private member.
   */
  private static readonly _hostname: string = os.hostname();
  /**
   * @internal This is a private member.
   */
  private static readonly _processId: string = process.pid.toString(16);
  /**
   * @internal This is a private member.
   */
  private static readonly _platform: string = os.platform();
  /**
   * @internal This is a private member.
   */
  private static readonly _architecture: string = os.arch();
  /**
   * @internal This is a private member.
   */
  private static readonly _nodeVersion: string = process.versions.node;
  /**
   * @internal This is a private member.
   */
  private static readonly _architectureFmt: string = `${Logger._platform}-${Logger._architecture}` as const;

  /**
   * @internal This is a private member.
   */
  private static readonly _loggers: Map<string, Logger> = new Map<string, Logger>();

  //////////////////////////////////////////////////////////////////////////////
  // Private Static Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private static _singleton: Logger = null;
  /**
   * @internal This is a private member.
   */
  private static _noopSingletonLogger: Logger = null;

  //////////////////////////////////////////////////////////////////////////////
  // Private Readonly Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private readonly _name: string = undefined;
  /**
   * @internal This is a private member.
   */
  private readonly _fileName: string = undefined;
  /**
   * @internal This is a private member.
   */
  private readonly _fullyQualifiedLogFileName: string = undefined;
  /**
   * @internal This is a private member.
   */
  private readonly _lockedFileWriteStream: fs.WriteStream = null;

  //////////////////////////////////////////////////////////////////////////////
  // Private Properties
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private _logLevel: LogLevel = undefined;
  /**
   * @internal This is a private member.
   */
  private _logToConsole = true;
  /**
   * @internal This is a private member.
   */
  private _logToFileSystem = true;
  /**
   * @internal This is a private member.
   */
  private _cutLogPrefix = false;

  //////////////////////////////////////////////////////////////////////////////
  // Private Static Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private static _getFileSafeDateNowIsoString(): string {
    return new Date()
      .toISOString()
      .replace(/[^a-z0-9_-]/gi, '')
      .replace(/-/g, '');
  }

  /**
   * @internal This is a private member.
   */
  private static _getDateNowIsoString(): string {
    return new Date().toISOString();
  }

  /**
   * @internal This is a private member.
   */
  private static _getUptime(): string {
    return process.uptime().toFixed(7);
  }

  /**
   * @internal This is a private member.
   */
  private static _getColorSection(content: unknown): string {
    return util.format('[%s%s%s]', LogColor.BrightBlack, content, LogColor.Reset);
  }

  /**
   * @internal This is a private member.
   */
  private static _formatStackTrace(stackTrace: string): string {
    // Changes the first line from 'Error: {message}' to '{message}'
    const stackTraceLines = stackTrace.split('\n');
    stackTraceLines[0] = stackTraceLines[0].replace(/^Error: /, '');

    return stackTraceLines.join('\n');
  }

  //////////////////////////////////////////////////////////////////////////////
  // Private Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * @internal This is a private member.
   */
  private _constructFileLoggerMessage(logLevel: LogLevel, format: string, ...args: unknown[]): string {
    let formattedMessage = util.format(format, ...args);

    if (logLevel === LogLevel.Trace) {
      formattedMessage = util.format('%s', Logger._formatStackTrace(new Error(formattedMessage).stack));
    }

    if (this._cutLogPrefix) {
      return util.format(
        '[%s][%s][%s][%s][%s] %s\n',
        Logger._getDateNowIsoString(),
        Logger._localIp,
        Logger._hostname,
        this._name,
        logLevel.toUpperCase(),
        formattedMessage,
      );
    }

    return util.format(
      '[%s][%s][%s][%s][%s][%s][%s][%s][%s][%s] %s\n',
      Logger._getDateNowIsoString(),
      Logger._getUptime(),
      Logger._processId,
      Logger._architectureFmt,
      Logger._nodeVersion,
      Logger._localIp,
      Logger._hostname,
      projectDirectoryName,
      this._name,
      logLevel.toUpperCase(),
      formattedMessage,
    );
  }

  /* This method is async so it can be pushed to the task queue and not block the main one */
  /**
   * @internal This is a private member.
   */
  private async _logLocally(logLevel: LogLevel, format: string, ...args: unknown[]): Promise<void> {
    if (!this._logToFileSystem) return;

    this._lockedFileWriteStream?.write(this._constructFileLoggerMessage(logLevel, format, ...args));
  }

  /* Color Logging (Console) */

  /**
   * @internal This is a private member.
   */
  private _getSharedColorStringPrefix() {
    if (this._cutLogPrefix) {
      return util.format(
        '%s%s%s%s',
        Logger._getColorSection(Logger._getDateNowIsoString()),
        Logger._getColorSection(Logger._localIp),
        Logger._getColorSection(Logger._hostname),
        Logger._getColorSection(this._name),
      );
    }

    return util.format(
      '%s%s%s%s%s%s%s%s%s',
      Logger._getColorSection(Logger._getDateNowIsoString()),
      Logger._getColorSection(Logger._getUptime()),
      Logger._getColorSection(Logger._processId),
      Logger._getColorSection(Logger._architectureFmt),
      Logger._getColorSection(Logger._nodeVersion),
      Logger._getColorSection(Logger._localIp),
      Logger._getColorSection(Logger._hostname),
      Logger._getColorSection(projectDirectoryName),
      Logger._getColorSection(this._name),
    );
  }

  /**
   * @internal This is a private member.
   */
  private async _logConsole(logLevel: LogLevel, color: LogColor, format: string, ...args: unknown[]): Promise<void> {
    /* istanbul ignore if */
    if (!this._logToConsole) return;

    let formattedMessage = util.format(format, ...args);

    if (logLevel === LogLevel.Trace) {
      formattedMessage = util.format('%s', Logger._formatStackTrace(new Error(formattedMessage).stack));
    }

    const message = util.format(
      '%s[%s%s%s] %s%s%s',
      this._getSharedColorStringPrefix(),
      color,
      logLevel.toUpperCase(),
      LogColor.Reset,
      color,
      formattedMessage,
      LogColor.Reset,
    );

    console.log(message);
  }

  /**
   * @internal This is a private member.
   */
  private _checkLogLevel(logLevelToCheck: LogLevel): boolean {
    const values = Object.values(LogLevel);

    const actualLogLevel = values.indexOf(this._logLevel);
    const logLevelToCheckIndex = values.indexOf(logLevelToCheck);

    return actualLogLevel >= logLevelToCheckIndex;
  }

  /**
   * @internal This is a private member.
   */
  private _onFileStreamError(error: NodeJS.ErrnoException) {
    this._logToFileSystem = false;
    this._closeFileStream();

    if (error === undefined || error === null) {
      this.warning('File system file write stream error callback invoked, but error not actually provided.');
      return;
    }

    switch (error.code) {
      case 'EACCES':
        this.warning('File system file write stream error callback invoked. Permission denied.');
        break;
      case 'EISDIR':
        this.warning('File system file write stream error callback invoked. File is a directory.');
        break;
      case 'EMFILE':
        this.warning('File system file write stream error callback invoked. Too many open files.');
        break;
      case 'ENFILE':
        this.warning('File system file write stream error callback invoked. File table overflow.');
        break;
      case 'ENOENT':
        this.warning('File system file write stream error callback invoked. File not found.');
        break;
      case 'ENOSPC':
        this.warning('File system file write stream error callback invoked. No space left on device.');
        break;
      case 'EPERM':
        this.warning('File system file write stream error callback invoked. Operation not permitted.');
        break;
      case 'EROFS':
        this.warning('File system file write stream error callback invoked. Read-only file system.');
        break;
      default:
        this.warning('File system file write stream error callback invoked. Unknown error.');
        break;
    }
  }

  /**
   * @internal This is a private member.
   */
  private _createFileStream() {
    Object.defineProperty(this, '_lockedFileWriteStream', {
      value: fs.createWriteStream(this._fullyQualifiedLogFileName, { flags: 'a' }),
    });

    this._lockedFileWriteStream.on('error', this._onFileStreamError.bind(this));
  }

  /**
   * @internal This is a private member.
   */
  private _closeFileStream() {
    this._lockedFileWriteStream?.end();
    this._lockedFileWriteStream?.destroy();
    Object.defineProperty(this, '_lockedFileWriteStream', {
      value: undefined,
    });

    Object.defineProperty(this, '_fullyQualifiedLogFileName', {
      value: undefined,
    });
    Object.defineProperty(this, '_fileName', {
      value: undefined,
    });
  }

  /**
   * @internal This is a private member.
   */
  private _createFileName() {
    Object.defineProperty(this, '_fileName', {
      value: util.format(
        'log_%s_%s_%s_%s.log',
        this._name,
        process.version,
        Logger._getFileSafeDateNowIsoString(),
        process.pid.toString(16).toUpperCase(),
      ),
    });
    Object.defineProperty(this, '_fullyQualifiedLogFileName', {
      value: path.join(Logger._logFileBaseDirectory, this._fileName),
    });

    if (!fs.existsSync(Logger._logFileBaseDirectory)) {
      try {
        fs.mkdirSync(Logger._logFileBaseDirectory, { recursive: true });
      } catch (error: unknown) {
        if (error instanceof Error) {
          if ((<NodeJS.ErrnoException>error).code === 'EPERM' || (<NodeJS.ErrnoException>error).code === 'EACCES') {
            this._logToFileSystem = false;
            this.warning(
              'Unable to create log file directory. Please ensure that the current user has permission to create directories.',
            );

            return;
          }

          throw error; // rethrow
        }
      }
    }
  }

  //////////////////////////////////////////////////////////////////////////////
  // Public Static Helper Methods
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Requests that the log file directory be cleared.
   *
   * @param {boolean} override - If true, the log file directory will be cleared regardless of environment variables.
   * @returns {void} - Nothing.
   */
  public static tryClearLocalLog(override = false): void {
    Logger.singleton.log('Try clear local log files...');

    try {
      if (environment.persistLocalLogs) {
        if (override) {
          Logger.singleton.warning('Override flag set. Clearing local log files.');
        } else {
          Logger.singleton.warning('Local log files will not be cleared because persistLocalLogs is set to true.');
          return;
        }
      }

      Logger.singleton.log('Clearing local log files...');

      Logger._loggers.forEach((logger) => {
        logger._closeFileStream();
      });

      if (fs.existsSync(Logger._logFileBaseDirectory)) {
        fs.rmSync(Logger._logFileBaseDirectory, { recursive: true, force: true });
        fs.mkdirSync(Logger._logFileBaseDirectory, { recursive: true });
      }

      Logger._loggers.forEach((logger) => {
        if (logger._logToFileSystem) {
          logger._createFileName();
          logger._createFileStream();
        }
      });
    } catch (error) {
      Logger.singleton.error('Error clearing local log files: %s', error);
    }
  }

  /**
   * Tries to clear out all tracked loggers.
   * @returns {void} - Nothing.
   */
  public static tryClearAllLoggers(): void {
    Logger.singleton.log('Try clear all loggers...');

    try {
      Logger._loggers.forEach((logger) => {
        // Avoid clearing noop logger and singleton logger
        if (logger._name !== Logger._singleton?._name && logger._name !== Logger._noopSingletonLogger?._name) {
          logger._lockedFileWriteStream?.end?.call(logger._lockedFileWriteStream);
          logger._lockedFileWriteStream?.destroy?.call(logger._lockedFileWriteStream);

          // Remove the logger from the list of loggers
          Logger._loggers.delete(logger._name);
        }
      });
    } catch (error) {
      Logger.singleton.error('Error clearing all loggers: %s', error);
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Constructor
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Creates a new instance of the Logger class.
   * @param {string} name - The name of the logger.
   * @param {string=} logLevel - The log level of the logger.
   * @param {boolean=} logToFileSystem - If true, the logger will log to the file system.
   * @param {boolean=} logToConsole - If true, the logger will log to the console.
   * @param {boolean=} cutLogPrefix - If true, the logger will cut the log prefix.
   * @note If you do not require a specific logger, use logger.singleton instead.
   */
  public constructor(
    name: string,
    logLevel: LogLevel = LogLevel.Info,
    logToFileSystem = true,
    logToConsole = true,
    cutLogPrefix = true,
  ) {
    if (name === undefined || name === null) {
      throw new ReferenceError(invalidConstructorName);
    }
    if (typeof name !== 'string') {
      throw new TypeError(invalidConstructorNameType);
    }
    if (name.length === 0) {
      throw new RangeError(invalidConstructorNameEmpty);
    }
    if (!nameRegex.test(name)) {
      throw new SyntaxError(invalidConstructorNameRegex);
    }
    if (Logger._loggers.has(name)) {
      throw new ReferenceError(`Logger with name '${name}' already exists.`);
    }

    if (logLevel === undefined || logLevel === null) {
      throw new ReferenceError(invalidConstructorLogLevel);
    }
    if (typeof logLevel !== 'string') {
      throw new TypeError(invalidConstructorLogLevelType);
    }
    logLevel = logLevel?.toLowerCase() as LogLevel;
    if (Object.values(LogLevel).indexOf(logLevel) === -1) {
      throw new TypeError(
        `Invalid log level: ${logLevel}. Valid log levels are: ${Object.values(LogLevel).join(', ')}`,
      );
    }

    if (logToFileSystem === undefined || logToFileSystem === null) {
      throw new ReferenceError(invalidConstructorLogToFileSystem);
    }
    if (typeof logToFileSystem !== 'boolean') {
      throw new TypeError(invalidConstructorLogToFileSystemType);
    }

    if (logToConsole === undefined || logToConsole === null) {
      throw new ReferenceError(invalidConstructorLogToConsole);
    }
    if (typeof logToConsole !== 'boolean') {
      throw new TypeError(invalidConstructorLogToConsoleType);
    }

    if (cutLogPrefix === undefined || cutLogPrefix === null) {
      throw new ReferenceError(invalidConstructorCutLogPrefix);
    }
    if (typeof cutLogPrefix !== 'boolean') {
      throw new TypeError(invalidConstructorCutLogPrefixType);
    }

    Logger._loggers.set(name, this);

    this._name = name;
    this._logLevel = logLevel;
    this._logToFileSystem = logToFileSystem;
    this._logToConsole = logToConsole;
    this._cutLogPrefix = cutLogPrefix;

    // Check if there's a there's actually a terminal to log to
    this._logToConsole = this._logToConsole && process.stdout.isTTY && process.stderr.isTTY;

    if (this._logToFileSystem) {
      this._createFileName();
      this._createFileStream();
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Static Getters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets a singleton instance of the Logger class.
   * @returns {Logger} - The singleton instance of the Logger class.
   * @note This is the recommended way to get a logger if you do not require a specific logger.
   */
  public static get singleton(): Logger {
    if (Logger._singleton === null) {
      Logger._singleton = new Logger(
        environment.loggerDefaultName,
        environment.logLevel,
        environment.logToFileSystem,
        environment.logToConsole,
        environment.loggerCutPrefix,
      );
    }

    return Logger._singleton;
  }

  /**
   * Gets a singleton instance of the Logger class that noops all logging.
   * @returns {Logger} - The singleton instance of the Logger class.
   * @note This is the recommended way to get a logger if you do not require a specific logger.
   */
  public static get noopSingleton(): Logger {
    if (Logger._noopSingletonLogger === null) {
      Logger._noopSingletonLogger = new Logger(
        environment.loggerDefaultName + '_noop',
        LogLevel.None,
        false,
        false,
        environment.loggerCutPrefix,
      );
    }

    return Logger._noopSingletonLogger;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Getters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Gets the name of the logger.
   * @returns {string} - The name of the logger.
   */
  public get name(): string {
    return this._name;
  }

  /**
   * Gets the log level of the logger.
   * @returns {LogLevel} - The log level of the logger.
   * @note The log level is one of the following: none, error, warning, info, debug, trace.
   */
  public get logLevel(): LogLevel {
    return this._logLevel;
  }

  /**
   * Gets the value that determines if this logger will log to the file system.
   * @returns {boolean} - The value that determines if this logger will log to the file system.
   */
  public get logToFileSystem(): boolean {
    return this._logToFileSystem;
  }

  /**
   * Gets the value that determines if this logger will log to the console.
   * @returns {boolean} - The value that determines if this logger will log to the console.
   */
  public get logToConsole(): boolean {
    return this._logToConsole;
  }

  /**
   * Gets the value that determines if this logger will cut the log prefix.
   * @returns {boolean} - The value that determines if this logger will cut the log prefix.
   */
  public get cutLogPrefix(): boolean {
    return this._cutLogPrefix;
  }

  /**
   * Gets the log file name.
   * @returns {string} - The log file name.
   * @note This is only useful if {@link Logger.logToFileSystem} is true.
   */
  public get fileName(): string {
    return this._fileName;
  }

  /**
   * Gets the fully qualified log file name.
   * @returns {string} - The fully qualified log file name.
   * @note This is only useful if {@link Logger.logToFileSystem} is true.
   */
  public get fullyQualifiedLogFileName(): string {
    return this._fullyQualifiedLogFileName;
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Setters
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Sets the log level of the logger.
   * @param {LogLevel} value - The log level of the logger.
   * @note The log level is one of the following: none, error, warning, info, debug, trace.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type string or LogLevel.
   * @throws {TypeError} - Value supplied must be one of the following: none, error, warning, info, debug, trace.
   */
  public set logLevel(value: LogLevel) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'string') {
      throw new TypeError(invalidSetterLogLevelType);
    }

    value = value?.toLowerCase() as LogLevel;
    if (Object.values(LogLevel).indexOf(value) === -1) {
      throw new TypeError(`Invalid log level: ${value}. Valid log levels are: ${Object.values(LogLevel).join(', ')}`);
    }

    if (this.logLevel !== value) {
      this._logLevel = value;
    }
  }

  /**
   * Sets the value that determines if this logger will log to the file system.
   * @param {boolean} value - The value that determines if this logger will log to the file system.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type boolean.
   */
  public set logToFileSystem(value: boolean) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(invalidSetterBooleanValue);
    }

    if (this._logToFileSystem !== value) {
      this._logToFileSystem = value;

      if (value === true) {
        this._createFileName();
        this._createFileStream();
      } else {
        this._closeFileStream();
      }
    }
  }

  /**
   * Sets the value that determines if this logger will log to the console.
   * @param {boolean} value - The value that determines if this logger will log to the console.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type boolean.
   */
  public set logToConsole(value: boolean) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(invalidSetterBooleanValue);
    }

    if (this._logToConsole !== value) {
      this._logToConsole = value;
    }
  }

  /**
   * Sets the value that determines if this logger will cut the log prefix.
   * @param {boolean} value - The value that determines if this logger will cut the log prefix.
   * @throws {ReferenceError} - Value cannot be null or undefined.
   * @throws {TypeError} - Value supplied must of type boolean.
   */
  public set cutLogPrefix(value: boolean) {
    if (value === undefined || value === null) {
      throw new ReferenceError(setterValueCannotBeUndefinedOrNull);
    }
    if (typeof value !== 'boolean') {
      throw new TypeError(invalidSetterBooleanValue);
    }

    if (this._cutLogPrefix !== value) {
      this._cutLogPrefix = value;
    }
  }

  ////////////////////////////////////////////////////////////////////////////////
  // Public Log Methods
  ////////////////////////////////////////////////////////////////////////////////

  /**
   * Logs a regular message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async log(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }

    if (!this._checkLogLevel(LogLevel.Info)) return;

    await this._logConsole(LogLevel.Info, LogColor.BrightWhite, message, ...args);
    await this._logLocally(LogLevel.Info, message, ...args);
  }

  /**
   * Logs a warning message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async warning(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }

    if (!this._checkLogLevel(LogLevel.Warning)) return;

    await this._logConsole(LogLevel.Warning, LogColor.BrightYellow, message, ...args);
    await this._logLocally(LogLevel.Warning, message, ...args);
  }

  /**
   * Logs a trace message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @remarks This will create a trace back directly from this method, not the method that called it.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async trace(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }

    if (!this._checkLogLevel(LogLevel.Trace)) return;

    await this._logConsole(LogLevel.Trace, LogColor.BrightMagenta, message, ...args);
    await this._logLocally(LogLevel.Trace, message, ...args);
  }

  /**
   * Logs a debug message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async debug(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }

    if (!this._checkLogLevel(LogLevel.Debug)) return;

    await this._logConsole(LogLevel.Debug, LogColor.BrightMagenta, message, ...args);
    await this._logLocally(LogLevel.Debug, message, ...args);
  }

  /**
   * Logs an info message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async information(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }

    if (!this._checkLogLevel(LogLevel.Info)) return;

    await this._logConsole(LogLevel.Info, LogColor.BrightBlue, message, ...args);
    await this._logLocally(LogLevel.Info, message, ...args);
  }

  /**
   * Logs an error message.
   * @param {string} message - The message to log.
   * @param {any[]} ...args - The arguments to pass to the message.
   * @returns {void} - Nothing.
   * @throws {TypeError} - The `this` keyword is the incorrect type, if you are applying this to a callback, please call this within a lambda instead of passing the method as a callback.
   * @throws {ReferenceError} - Message cannot be null or undefined.
   * @throws {TypeError} - Message supplied must of type string or function that returns a string.
   * @throws {RangeError} - Message supplied must be at least 1 character long.
   * @throws {TypeError} - Arguments supplied must be of type Array. (Spread operator will work.)
   */
  public async error(message: string | (() => string), ...args: unknown[]): Promise<void> {
    if (!(this instanceof Logger)) {
      throw new TypeError(thisKeywordIncorrectClosure);
    }
    if (message === undefined || message === null) {
      throw new ReferenceError(invalidLogMessage);
    }
    if (typeof message === 'function') {
      message = message();
    }
    if (typeof message !== 'string') {
      throw new TypeError(invalidLogMessageType);
    }
    if (message.length === 0) {
      throw new RangeError(invalidLogMessage);
    }

    if (!this._checkLogLevel(LogLevel.Error)) return;

    await this._logConsole(LogLevel.Error, LogColor.BrightRed, message, ...args);
    await this._logLocally(LogLevel.Error, message, ...args);
  }
}
