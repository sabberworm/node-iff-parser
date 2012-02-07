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
	var i, chunk;
	for(i=0;i<this.chunks.length;i++) {
		chunk = this.chunks[i];
		if(chunk.ckID === id) {
			return chunk;
		}
	}
	return null;
};
ContainerChunk.prototype.chunksById = function(id) {
	return this.chunks.filter(function(chunk) {
		return chunk.ckID === id;
	});
};

module.exports = ContainerChunk;
