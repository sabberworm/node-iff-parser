var TreeChunk = function(ckID, ckSize, ckData) {
	this.ckID = ckID;
	this.ckSize = ckSize;
	this.ckData = ckData;
	this.chunks = [];
}

TreeChunk.prototype.addChunk = function(chunk) {
	this.chunks.push(chunk);
}
TreeChunk.prototype.chunkById = function(id) {
	var result = null;
	this.chunks.forEach(function(chunk) {
		if(chunk.ckID === id) {
			result = chunk;
			return false;
		}
	});

	return result;
};
TreeChunk.prototype.chunksById = function(id) {
	return this.chunks.filter(function(chunk) {
		return chunk.ckID === id;
	});
};

module.exports = TreeChunk;
