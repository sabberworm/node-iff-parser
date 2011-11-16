var File = function(name) {
	this.name = name;
	this.type = null;
	this.content = null;
}

File.prototype.addChunk = function(chunk) {
	this.content = chunk;
}
File.prototype.chunkById = function(id) {
	if(this.content && this.content.ckID === id) {
		return this.content;
	}
	return null;
};

module.exports = File;
