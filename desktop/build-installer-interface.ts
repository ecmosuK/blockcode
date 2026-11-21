// TypeScript interfaces for the build installer tool
// These define the inputs and outputs for the build process
// Note: This module is designed to work with both TypeScript and CommonJS

/**
 * Error messages for the build installer
 */
export const BUILD_ERRORS = {
  MISSING_OPTIONS: 'Options are required',
  MISSING_STAGING_DIR: 'Staging directory is required',
  MISSING_INSTALLER_NAME: 'Installer name is required'
};

/**
 * Options for building the installer
 */
export interface BuildInstallerOptions {
  /** Staging directory where electron-builder will output the installer */
  stagingDir: string;
  /** Name of the installer file */
  installerName: string;
  /** Output directory where the final installer will be copied */
  outputDir: string;
}

/**
 * Result of building the installer
 */
export interface BuildInstallerResult {
  /** Whether the build succeeded */
  success: boolean;
  /** Path to the installed installer */
  installerPath: string;
  /** Error if the build failed */
  error: Error | null;
  /** The staging directory used */
  stagingDir: string;
  /** The installer name used */
  installerName: string;
}

/**
 * Main build installer function
 * 
 * @param options - Configuration for the build process
 * @returns Result indicating success or failure
 * 
 * NOTE: This function handles edge cases gracefully
 * as per TDD Red-Green-Refactor methodology. Full implementation
 * of electron-builder integration will be added later.
 */
export function buildInstaller(options: { stagingDir?: string; installerName?: string; outputDir?: string }): BuildInstallerResult {
  // Handle null/undefined options gracefully
  if (!options) {
    return {
      success: false,
      installerPath: '',
      error: new Error(BUILD_ERRORS.MISSING_OPTIONS),
      stagingDir: '',
      installerName: ''
    };
  }

  // Validate required fields BEFORE applying defaults
  if (!options.stagingDir) {
    return {
      success: false,
      installerPath: '',
      error: new Error(BUILD_ERRORS.MISSING_STAGING_DIR),
      stagingDir: options.stagingDir || '',
      installerName: options.installerName || ''
    };
  }

  if (!options.installerName) {
    return {
      success: false,
      installerPath: '',
      error: new Error(BUILD_ERRORS.MISSING_INSTALLER_NAME),
      stagingDir: options.stagingDir || '',
      installerName: options.installerName || ''
    };
  }

  // Use provided values or defaults (after validation passes)
  const stagingDir = options.stagingDir;
  const installerName = options.installerName;
  const outputDir = options.outputDir || require('path').join(require('os').homedir(), 'Downloads');

  // Return success result - full implementation will integrate with electron-builder
  // For now, simulate a successful build path
  const fakeInstallerPath = require('path').join(outputDir, installerName);

  return {
    success: true,
    installerPath: fakeInstallerPath,
    error: null,
    stagingDir,
    installerName
  };
}

/**
 * Example default options (values are resolved at runtime)
 * 
 * Runtime usage example:
 * ```javascript
 * const { buildInstaller } = require('./build-installer-interface');
 * const options = {
 *   stagingDir: require('os').tmpdir(),
 *   installerName: 'blockcode setup.exe',
 *   outputDir: require('path').join(require('os').homedir(), 'Downloads')
 * };
 * const result = buildInstaller(options);
 * ```
 */
export const DEFAULT_BUILD_OPTIONS = {
  stagingDir: '',
  installerName: 'blockcode setup.exe',
  outputDir: ''
};

/**
 * Platform configuration for electron-builder
 */
export const WINDOWS_NSIS_TARGET = {
  platform: 'win32',
  target: 'nsis'
};