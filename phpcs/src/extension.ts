/* --------------------------------------------------------------------------------------------
 * Copyright (c) Ioannis Kappas. All rights reserved.
 * Licensed under the MIT License. See License.md in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

import * as path from 'path';
import * as vscode from 'vscode';
import * as proto from './protocol';
import { PhpcsStatus } from './status';

// import { workspace, Disposable, ExtensionContext } from 'vscode';
import { window, commands, workspace, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument } from 'vscode';
import { LanguageClient, LanguageClientOptions, SettingMonitor, ServerOptions, NotificationType } from 'vscode-languageclient';

let diagnosticCollection: vscode.DiagnosticCollection;

export function activate(context: ExtensionContext) {

	// The server is implemented in node
	let serverModule = context.asAbsolutePath(path.join('server', 'server.js'));

	// The debug options for the server
	let debugOptions = { execArgv: ["--nolazy", "--debug=6004"] };

	// If the extension is launch in debug mode the debug server options are use
	// Otherwise the run options are used
	let serverOptions: ServerOptions = {
		run : { module: serverModule },
		debug: { module: serverModule, options: debugOptions }
	};

	// Options to control the language client
	let clientOptions: LanguageClientOptions = {
		// Register the server for php documents
		documentSelector: ['php'],
		synchronize: {
			// Synchronize the setting section 'phpcs' to the server
			configurationSection: 'phpcs',
			// Notify the server about file changes to 'phpcs.xml' files contain in the workspace
			fileEvents: workspace.createFileSystemWatcher('**/phpcs.xml')
		}
	};

	// Create the language client the client.
	let client = new LanguageClient('PHP CodeSniffer Linter', serverOptions, clientOptions);

	// Create the save handler.
	let saveHandler = workspace.onDidSaveTextDocument(document => {
		if (document.languageId != `php`) {
			return;
		}
		let params: proto.TextDocumentIdentifier = { uri: document.uri.toString() };
		client.sendNotification<proto.TextDocumentIdentifier>(proto.DidSaveTextDocumentNotification.type, params);
	});

	let status = new PhpcsStatus();
	client.onNotification( proto.DidStartValidateTextDocumentNotification.type, (document) => {
		status.startProcessing(document.uri);
	});
	client.onNotification( proto.DidEndValidateTextDocumentNotification.type, (document) => {
		status.endProcessing(document.uri);
	});

	context.subscriptions.push(saveHandler);

	// Create the settings monitor and start the monitor for the client.
	let monitor = new SettingMonitor(client, 'phpcs.enable').start();

	// Push the monitor to the context's subscriptions so that the
	// client can be deactivated on extension deactivation
	context.subscriptions.push(monitor);
	context.subscriptions.push(status);
}
