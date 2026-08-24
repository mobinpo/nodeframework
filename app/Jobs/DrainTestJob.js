'use strict';
class DrainTestJob {
    constructor(data) { this.data = data || {}; }
    async handle() {
        require('fs').writeFileSync('/tmp/nodevel-drain-galaaE/handled.json', JSON.stringify(this.data));
    }
}
module.exports = DrainTestJob;
