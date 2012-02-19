exports.unpack = function(bufferprops, compression, length) {
	var result = null;
	if(compression === 'cmpNone') {
		result = bufferprops.buffer.slice(bufferprops.offset, bufferprops.offset+length);
		bufferprops.offset += length;
	} else if(compression === 'cmpByteRun1') {
		result = new Buffer(length);
		var index = 0;
		var currentByte = null;
		while(index < length) {
			currentByte = bufferprops.buffer.readInt8(bufferprops.offset++);
			if(currentByte >= 0 && currentByte <= 127) {
				currentByte++;
				bufferprops.buffer.copy(result, index, bufferprops.offset, bufferprops.offset+currentByte);
				index += currentByte;
				bufferprops.offset += currentByte;
			} else if(currentByte >= -127 && currentByte <= -1) {
				currentByte = -currentByte + 1;
				nextByte = bufferprops.buffer.readUInt8(bufferprops.offset++);
				while(currentByte > 0) {
					result[index++] = nextByte;
					currentByte--;
				}
			} else {
				//currentByte === 128 => noop
			}
		}
	} else {
		throw "Compression "+compression+" not supported";
	}
	return result;
};

exports.ilbm_canvas = function(file, colorMap) {
	if(file.type !== 'ILBM') {
		throw "Only IFF-ILBM files supported, "+file.type+" given";
	}
	var root = file.content;
	if(!colorMap) {
		colorMap = root.chunkById('CMAP');
	}
	var properties = root.chunkById('BMHD');
	var body = root.chunkById('BODY');
	var Canvas = require('canvas');
	var canvas = new Canvas(properties.width, properties.height);
	var ctx = canvas.getContext('2d');
	var im = ctx.createImageData(properties.width, properties.height);

	var transparentPlane = properties.masking === 'mskHasMask' ? properties.planes - 1 : null;
	var transparentColor = properties.masking === 'mskHasTransparentColor' ? properties.transparentColor : null;

	//Planes are channels, just strangely named…
	var expectedBytesPerRow = properties.width/8;
	var bufferprops = {buffer: body.ckData, offset: 0};
	var counter = 0;
	for(var line=0;line<properties.height;line++) {
		var planes = [];
		for(var row=0;row<properties.planes;row++) {
			planes.push(exports.unpack(bufferprops, properties.compression, expectedBytesPerRow));
		}
		planes.reverse();
		for(var col=0;col<properties.width;col++) {
			//get the bits from each plane
			byteNumber = Math.floor(col/8);
			bitNumber = 7 - col%8;
			colorNumber = 0;
			isTransparent = false;
			var lastPlane = planes.length - 1;
			planes.forEach(function(plane, count) {
				var bit = plane.readUInt8(byteNumber);
				bit = (bit >> bitNumber) & 0x01;
				if(count === transparentPlane) {
					isTransparent = !bit;
				} else {
					colorNumber = (colorNumber << 1) | bit;
				}
			});
			if(transparentColor) {
				isTransparent = colorNumber === transparentColor;
			}
			var color = colorMap.colors[colorNumber];
			im.data[counter++] = color.red;
			im.data[counter++] = color.green;
			im.data[counter++] = color.blue;
			im.data[counter++] = isTransparent ? 0 : 255;
		}
	}
	ctx.putImageData(im, 0, 0);
	return canvas;
};

/**
* Write a MIDI file to a stream containing the score given as parsed SMUS IFF. Requires midimal.
* @param file The parsed IFF-SMUS
* @param instrument_sets Instrument replacements in the form {"SMUS-Instrument-Name": "MIDI-Instrument-Name"} (optional).
* @return The MIDImalWriter instance.
*/
exports.smus_write_midi = function(file, instrument_sets) {
	if(file.type !== 'SMUS') {
		throw "Only SMUS files supported, "+file.type+" given";
	}
	var header = file.content.chunkById('SHDR');
	
	instrument_sets = instrument_sets || {};
	var midimal = require('midimal');
	var midi = new midimal.MIDI({volume: header.volume});
	var instruments = [];
	var quarter_notes_per_minute = header.tempo/128;
	var full_notes_per_minute = quarter_notes_per_minute/4;
	var full_notes_per_millisecond = full_notes_per_minute/60000;
	file.content.chunksById('INS1').forEach(function(instrument_chunk) {
		if(instrument_sets[instrument_chunk.name]) {
			instrument_chunk.name = instrument_sets[instrument_chunk.name];
		}
		instruments[instrument_chunk.register] = midimal.utils.instrument().from_name(instrument_chunk.name);
	});
	file.content.chunksById('TRAK').forEach(function(track_chunk, track_index) {
		var track = midi.track();
		var instrument = null;
		var rest = 200; //Add a rest of 0.2s to the beginning of each track
		var durationAdd = 0;
		track_chunk.notes.forEach(function(note) {
			var duration = 1/Math.pow(2, note.division);
			if(note.isDotted) {
				duration *= 3/2;
			}
			if(note.tupletType !== 0) {
				duration *= (note.tupletType*2)/((note.tupletType*2)+1);
			}
			if(note.isTied) {
				durationAdd += duration;
				return;
			}
			duration += durationAdd;
			duration = Math.round(duration/full_notes_per_millisecond);
			if(note.rest) {
				rest += duration;
				return;
			}
			if(note.instrument === -1) {
				note.instrument = track_index;
			}
			if(instrument !== note.instrument) {
				instrument = note.instrument;
				track.instrument(instruments[instrument]);
			}
			track.note(midimal.utils.note().key(note.tone).velocity(note.volume).force(false), duration, rest);
			rest = 0; durationAdd = 0;
		});
	});
	return midi;
};