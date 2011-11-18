var ContainerChunk = function(ckID, ckSize, ckData) {
	this.chunkType = 'ContainerChunk';
	this.ckID = ckID;
	this.ckSize = ckSize;
	this.ckData = ckData;
	this.chunks = [];
}

ContainerChunk.prototype.addChunk = function(chunk) {
	this.chunks.push(chunk);
};
ContainerChunk.prototype.chunkById = function(id) {
	var result = null;
	this.chunks.forEach(function(chunk) {
		if(chunk.ckID === id) {
			result = chunk;
			return false;
		}
	});

	return result;
};
ContainerChunk.prototype.chunksById = function(id) {
	return this.chunks.filter(function(chunk) {
		return chunk.ckID === id;
	});
};

module.exports = ContainerChunk;
