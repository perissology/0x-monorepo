import * as _ from 'lodash';

import { constants } from './constants';
import { getTracesByContractAddress } from './trace';
import { TraceCollectionSubprovider } from './trace_collection_subprovider';
import { TraceInfo, TraceInfoExistingContract, TraceInfoNewContract } from './types';

// TraceInfoSubprovider is extended by subproviders which need to work with one
// TraceInfo at a time. It has one abstract method: _handleTraceInfoAsync, which
// is called for each TraceInfo.
export abstract class TraceInfoSubprovider extends TraceCollectionSubprovider {
    protected abstract _handleTraceInfoAsync(traceInfo: TraceInfo): Promise<void>;
    protected async _recordTxTraceAsync(address: string, data: string | undefined, txHash: string): Promise<void> {
        await this._web3Wrapper.awaitTransactionMinedAsync(txHash, 0);
        const trace = await this._web3Wrapper.getTransactionTraceAsync(txHash, {
            disableMemory: true,
            disableStack: false,
            disableStorage: true,
        });
        const tracesByContractAddress = getTracesByContractAddress(trace.structLogs, address);
        const subcallAddresses = _.keys(tracesByContractAddress);
        for (const subcallAddress of subcallAddresses) {
            let traceInfo: TraceInfoNewContract | TraceInfoExistingContract;
            const traceForThatSubcall = tracesByContractAddress[subcallAddress];
            if (subcallAddress === 'NEW_CONTRACT') {
                traceInfo = {
                    subtrace: traceForThatSubcall,
                    txHash,
                    address: subcallAddress,
                    bytecode: data as string,
                };
            } else if (subcallAddress.startsWith(constants.CREATE_PLACEHOLDER_PREFIX)) {
                const deployedAddress = subcallAddress.replace(constants.CREATE_PLACEHOLDER_PREFIX, '');
                const runtimeBytecode = await this._web3Wrapper.getContractCodeAsync(deployedAddress);
                traceInfo = {
                    subtrace: traceForThatSubcall,
                    txHash,
                    address: 'NEW_CONTRACT',
                    // we use runtimeBytecode here b/c it is what we can fetch.
                    // the later call to `utils.getContractDataIfExists` in TraceCollector
                    // will compare the bytecode to the contractData bytecode & runtimeBytecode
                    // so the contract will still find a match
                    bytecode: runtimeBytecode,
                };
            } else {
                const runtimeBytecode = await this._web3Wrapper.getContractCodeAsync(subcallAddress);
                traceInfo = {
                    subtrace: traceForThatSubcall,
                    txHash,
                    address: subcallAddress,
                    runtimeBytecode,
                };
            }
            await this._handleTraceInfoAsync(traceInfo);
        }
    }
}
