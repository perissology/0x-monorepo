import { Compiler, CompilerOptions } from '@0xproject/sol-compiler';
import * as fs from 'fs';
import * as glob from 'glob';
import * as _ from 'lodash';
import * as path from 'path';
import * as rimraf from 'rimraf';

import { ContractData } from './types';

export async function collectContractsDataAsync(artifactsPath: string, sourcesPath: string): Promise<ContractData[]> {
    const artifactsGlob = `${artifactsPath}/**/*.json`;
    const artifactFileNames = glob.sync(artifactsGlob, { absolute: true });
    const contractsData: ContractData[] = [];
    for (const artifactFileName of artifactFileNames) {
        const artifact = JSON.parse(fs.readFileSync(artifactFileName).toString());
        const isTruffleArtifact = !_.isUndefined(artifact.updatedAt);
        if (isTruffleArtifact) {
            const compilerVersion = artifact.compiler.version;
            const artifactsDir = path.join(artifactsPath, '0x-artifacts');
            const compilerOptions: CompilerOptions = {
                contractsDir: sourcesPath,
                artifactsDir,
                compilerSettings: {
                    outputSelection: {
                        ['*']: {
                            ['*']: ['abi', 'evm.bytecode.object', 'evm.deployedBytecode.object'],
                        },
                    },
                },
                contracts: '*',
                // "0.4.23+commit.124ca40d.Emscripten.clang" -> "0.4.23"
                solcVersion: compilerVersion.split('+')[0],
            };
            const compiler = new Compiler(compilerOptions);
            await compiler.compileAsync();
            const contractsDataFrom0xArtifacts = await collectContractsDataAsync(artifactsDir, sourcesPath);
            // rimraf.sync(artifactsDir);
            return contractsDataFrom0xArtifacts;
        } else {
            const sources = _.keys(artifact.sources);
            const contractName = artifact.contractName;
            // We don't compute coverage for dependencies
            const sourceCodes = _.map(sources, (source: string) =>
                fs.readFileSync(path.join(sourcesPath, source)).toString(),
            );
            const contractData = {
                sourceCodes,
                sources,
                bytecode: artifact.compilerOutput.evm.bytecode.object,
                sourceMap: artifact.compilerOutput.evm.bytecode.sourceMap,
                runtimeBytecode: artifact.compilerOutput.evm.deployedBytecode.object,
                sourceMapRuntime: artifact.compilerOutput.evm.deployedBytecode.sourceMap,
            };
            contractsData.push(contractData);
        }
    }
    return contractsData;
}
