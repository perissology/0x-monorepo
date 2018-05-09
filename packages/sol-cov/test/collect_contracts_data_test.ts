import * as chai from 'chai';
import * as _ from 'lodash';
import 'mocha';
import * as path from 'path';

import { collectContractsDataAsync } from '../src/collect_contract_data';

const expect = chai.expect;

describe('Collect contracts data', () => {
    describe('#collectContractsData', () => {
        it('correctly collects contracts data', async () => {
            const artifactsPath = path.resolve(__dirname, 'fixtures/artifacts');
            const sourcesPath = path.resolve(__dirname, 'fixtures/contracts');
            const contractsData = await collectContractsDataAsync(artifactsPath, sourcesPath);
            _.forEach(contractsData, contractData => {
                expect(contractData).to.have.keys([
                    'sourceCodes',
                    'sources',
                    'sourceMap',
                    'sourceMapRuntime',
                    'bytecode',
                    'runtimeBytecode',
                ]);
            });
        });
    });
});
