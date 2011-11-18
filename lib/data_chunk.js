var DataChunk = function(ckID, ckSize, ckData) {
	this.chunkType = 'DataChunk';
	this.ckID = ckID;
	this.ckSize = ckSize;
	this.ckData = ckData;
}

DataChunk.prototype.toString = function() {
	return this.ckID;
}

module.exports = DataChunk;
