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
		var colorMap = root.chunkById('CMAP');
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
}
