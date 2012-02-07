var File = require('./file.js'),
    fs = require('fs'),
    DataChunk = require('./data_chunk.js'),
		ContainerChunk = require('./container_chunk.js');

var Processors = {
	// Generic Chunks
	"FORM": function(chunk_info, parentChunk) {
		//FORM chunk found: this will thell us the file format of the parent chunk (a file chunk). Write it. Everything else is another list of chunks.
		parentChunk.type = chunk_info.ckData.toString('ascii', 0, 4);
		return {innerChunkBuffer: chunk_info.ckData.slice(4, chunk_info.ckSize), additionalData: {fileType: parentChunk.type}};
	},
	"CAT ": function(chunk_info, parentChunk) {
		contentsType = chunk_info.ckData.toString('ascii', 0, 4);
		return {innerChunkBuffer: chunk_info.ckData.slice(4, chunk_info.ckSize), additionalData: {contentsType: contentsType}};
	},
	"LIST": function(chunk_info, parentChunk) {
		contentsType = chunk_info.ckData.toString('ascii', 0, 4);
		return {innerChunkBuffer: chunk_info.ckData.slice(4, chunk_info.ckSize), additionalData: {contentsType: contentsType, properties: {}}};
	},
	"PROP": function(chunk_info, parentChunk) {
		formType = chunk_info.ckData.toString('ascii', 0, 4);
		if(parentChunk.properties) {
			parentChunk.properties[formType] = chunk_info.ckData.slice(4, chunk_info.ckSize);
		}
		return {additionalData: {formType: formType}};
	},
	
	//ILBM Chunks
	"BMHD": function(chunk_info, parentChunk) {
		var imageData = {};
		imageData.width = chunk_info.ckData.readUInt16BE(0);
		imageData.height = chunk_info.ckData.readUInt16BE(2);
		imageData.x = chunk_info.ckData.readInt16BE(4);
		imageData.y = chunk_info.ckData.readInt16BE(6);
		imageData.planes = chunk_info.ckData.readUInt8(8);
		imageData.masking = chunk_info.ckData.readUInt8(9);
		switch(imageData.masking) {
			case 0:
				imageData.masking = 'mskNone';
				break;
			case 1:
				imageData.masking = 'mskHasMask';
				break;
			case 2:
				imageData.masking = 'mskHasTransparentColor';
				break;
			case 3:
				imageData.masking = 'mskLasso';
				break;
		}
		imageData.compression = chunk_info.ckData.readUInt8(10);
		switch(imageData.compression) {
			case 0:
				imageData.compression = 'cmpNone';
				break;
			case 1:
				imageData.compression = 'cmpByteRun1';
				break;
		}
		imageData.transparentColor = chunk_info.ckData.readUInt16BE(12);
		imageData.xAspect = chunk_info.ckData.readUInt8(14);
		imageData.yAspect = chunk_info.ckData.readUInt8(15);
		imageData.pageWidth = chunk_info.ckData.readInt16BE(16);
		imageData.pageHeight = chunk_info.ckData.readInt16BE(18);
		return {additionalData: imageData};
	},
	"CMAP": function(chunk_info, parentChunk) {
		var colorData = {colorCount: chunk_info.ckSize/3, colors: []};
		for(var i=0;i<chunk_info.ckSize;i+=3) {
			colorData.colors.push({red: chunk_info.ckData.readUInt8(i+0), green: chunk_info.ckData.readUInt8(i+1), blue: chunk_info.ckData.readUInt8(i+2)});
		}
		return {additionalData: colorData};
	},
	"GRAB": function(chunk_info, parentChunk) {
		var grabData = {x: chunk_info.ckData.readInt16BE(0), y: chunk_info.ckData.readInt16BE(0)};
		return {additionalData: grabData};
	},
	"DEST": function(chunk_info, parentChunk) {
		var destData = {};
		destData.depth = chunk_info.ckData.readUInt8(0);
		destData.planePick = chunk_info.ckData.readUInt16BE(2);
		destData.planeOnOff = chunk_info.ckData.readUInt16BE(4);
		destData.planeMask = chunk_info.ckData.readUInt16BE(6);
		return {additionalData: destData};
	},
	"SPRT": function(chunk_info, parentChunk) {
		return {additionalData: {spritePrecedence: chunk_info.ckData.readUInt16BE(0)}};
	},
	"BODY": function(chunk_info, parentChunk) {
		if(parentChunk.fileType === 'ILBM') {
			//Do something here…?
		}
		return {};
	},
	"CRNG": function(chunk_info, parentChunk) {
		var colorCycleData = {};
		colorCycleData.rate = chunk_info.ckData.readInt16BE(2);
		colorCycleData.active = chunk_info.ckData.readInt16BE(4);
		colorCycleData.low = chunk_info.ckData.readInt8(6);
		colorCycleData.high = chunk_info.ckData.readInt8(7);
		return {additionalData: colorCycleData};
	},
	"CCRT": function(chunk_info, parentChunk) {
		var colorCycleData = {};
		colorCycleData.direction = chunk_info.ckData.readInt16BE(0);
		colorCycleData.start = chunk_info.ckData.readInt8(2);
		colorCycleData.end = chunk_info.ckData.readInt8(3);
		colorCycleData.seconds = chunk_info.ckData.readInt32BE(4);
		colorCycleData.microseconds = chunk_info.ckData.readInt32BE(8);
		return {additionalData: colorCycleData};
	},
	
	//SMUS Chunks
	"SHDR": function(chunk_info, parentChunk) {
		var headerData = {};
		headerData.tempo = chunk_info.ckData.readUInt16BE(0);
		headerData.volume = chunk_info.ckData.readUInt8(2);
		headerData.trackCount = chunk_info.ckData.readUInt8(3);
		return {additionalData: headerData};
	},
	"INS1": function(chunk_info, parentChunk) {
		var instrumentData = {};
		instrumentData.register = chunk_info.ckData.readUInt8(0);
		instrumentData.type = chunk_info.ckData.readUInt8(1);
		instrumentData.data1 = chunk_info.ckData.readUInt8(2);
		instrumentData.data2 = chunk_info.ckData.readUInt8(3);
		instrumentData.name = chunk_info.ckData.toString('ascii', 4);
		return {additionalData: instrumentData};
	},
	"TRAK": function(chunk_info, parentChunk) {
		var i = 0;
		var trackData = {
			notes: [],
			sharps: 0,
			flats: 0
		};
		var currentInstrument = -1;
		var currentVolume = 127;
		for(i = 0;i<chunk_info.ckData.length;i+=2) {
			var sId = chunk_info.ckData.readUInt8(i);
			var data = chunk_info.ckData.readUInt8(i+1);
			if(sId <= 128) { //SID_FirstNote till SID_LastNote as well as SID_Rest
				var isChord = ((data>>7)&1) === 1;
				var isTied = ((data>>6)&1) === 1;
				var tupletType = (data>>4)&3;
				var isDotted = ((data>>3)&1) === 1;
				var division = (data&&7)+1;
				trackData.notes.push({instrument: currentInstrument, tone: sId, rest: sId === 128, isChord: isChord, isTied: isTied, tupletType: tupletType, isDotted: isDotted, division: division, volume: currentVolume});
			} else if(sId === 129) { //SID_Instrument
				currentInstrument = data;
			} else if(sId === 130) { //SID_TimeSig
				var timeNSig = (data>>3)+1;
				var timeDSig = (data&7)*2;
				trackData.signature = {num: timeDSig, den: timeNSig};
			} else if(sId === 131) { //SID_KeySig
				if(data <= 7) {
					trackData.sharps = data;
				} else {
					data-=7;
					trackData.flats = data;
				}
			} else if(sId === 132) { //SID_Dynamic
				currentVolume = data;
			} else if(sId === 133) { //SID_MIDI_Chnl
				trackData.midiChannel = data;
			} else if(sId === 134) { //SID_MIDI_Preset
				trackData.midiPreset = data;
			} else if(sId <= 159) { //Instant Music SEvents
				//Do nothing
			} else if(sId <= 254) { //reserved for future standardization
				//Do nothing
			} else { //SID_Mark
				//Do nothing
			}
		}
		return {additionalData: trackData};
	},
	
	//Other Chunks
	"default": function(chunk_info, parentChunk) {
		//For unknown chunks, we can’t risk parsing the contents as a list of chunks
		return {innerChunkBuffer: null};
	}
};

var parseChunk = function(buffer, options) {
	options = options || {};
	var ckID = buffer.toString('ascii', options.offset, options.offset+4); options.offset+=4;
	var ckSize = buffer.readUInt32BE(options.offset); options.offset+=4;
	var has_padding = ckSize % 2 === 1;
	if(ckID === 'BODY' && options.offset+ckSize > buffer.length) {
		//Some BODY chunks incorrectly size the whole document…
		ckSize = buffer.length - options.offset;
		if(has_padding) {
			ckSize--;
		}
	}
	try {
		var ckData = buffer.slice(options.offset, options.offset+ckSize);
	} catch(e) {
		throw "Could not parse chunk "+ckID+": "+e;
	}
	options.offset += ckSize + (has_padding ? 1 : 0);
	return {ckID: ckID, ckSize: ckSize, ckData: ckData};
};

var parseChunkList = function(parser, parentChunk, buffer) {
	var options = {offset: 0};
	var key;
	while(options.offset < buffer.length-8) {
		var chunk_info = parseChunk(buffer, options);
		var processed = parser.processorForChunk(chunk_info.ckID)(chunk_info, parentChunk);
		var chunk = null;
		if(processed.innerChunkBuffer) {
			chunk = new ContainerChunk(chunk_info.ckID, chunk_info.ckSize);
			parseChunkList(parser, chunk, processed.innerChunkBuffer);
		} else {
			chunk = new DataChunk(chunk_info.ckID, chunk_info.ckSize, chunk_info.ckData);
		}
		if(processed.additionalData) {
			for(key in processed.additionalData) {
				chunk[key] = processed.additionalData[key];
			}
		}
		parentChunk.addChunk(chunk);
	}
};

var Parser = function(path, settings) {
	this.file = path;
	this.settings = settings || {};

	this.processorForChunk = function(type) {
		return (settings.processors && settings.processors[type]) || Processors[type] || Processors['default'];
	};

	this.parse = function(callback) {
		var _this = this;
		fs.readFile(this.file, function(error, buffer) {
			if(error) {
				return callback(error, null);
			}
			var result = new File(_this.file);
			//The root chunk (of type file) has the specialty that the whole ckData buffer is a single list of chunks
			try {
				parseChunkList(_this, result, buffer);
				result.tag = _this.settings.tag;
				callback(null, result);
			} catch(e) {
				callback(e, null);
			}
		});
	};
};


module.exports = Parser;
