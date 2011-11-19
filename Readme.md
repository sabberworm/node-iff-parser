The node-iff-parser parses Amiga IFF files (of all kinds) according to [specifications](http://www.martinreddy.net/gfx/2d/IFF.txt).

## Usage

    var IFFParser = require('iff-parser').Parser;
    var settings = {}; //Optional
    var parser = new IFFParser('/path/to/file', settings);
    parser.parse(function(error, result) {
        //Do something with the result
    });

IFF Chunks are parsed into nodes. There are nodes for container chunks (chunks that can contain other chunks), `ContainerChunk`, and nodes for data-only chunks (`DataChunk`). The top-level object returned is of type `File`, which is a special container chunk that can only contain one chunk. Said chunk can be accessed using the `.content` property (or using `chunkById('FORM')` for compatibility). The chunk returned is (for all valid files) a container of type `FORM`.

### Shared properties

Data and Container chunks both contain the following properties:

* `chunkType` containing `"DataChunk"`, `"File"` or `"ContainerChunk"`, respectively.
* `ckID` the type of the chunk as parsed as ascii string.
* `ckSize` the size (in bytes) that the chunk header specifies.
* `ckData` a Buffer of the data in the chunk (except id and size header fields). Note that this data is sliced for the data of the child chunks so changing this will also change the data of the child chunks.

### Properties specific to container chunks:

Container chunks additionally contain the following:

* `chunks` array of child chunks.
* `chunkById` convenience method to get the first child chunk of a specific type or null if no such chunk exists.
* `chunksById` convenience method to get an array of all child chunks of a specific types.

### Additional properties

Each chunk, before being made into an object of either type, is processed by a `processor`. There are built-in processors for various types such as the basic `LIST`, `FORM`, `CAT ` and `PROP` chunk types as well as some chunk types specific to the ILBM image file type. To create your own processor, simply pass the option `processors`. This option should be an object with the chunk types you wish to parse as keys and the processor function as value:

    settings = {
        processors: {
            "FXHD": function(chunk_info, parentChunk) {
                //chunk_info contains ckID, ckSize and ckData fields
                    var props = {
                    width = chunk_info.ckData.readUInt16BE(0),
                    …
                }
                return {additionalData: props, innerChunkBuffer: null}
            },
            …
        }
    };

If the returned `innerChunkBuffer` of a processor is non-null, the returned Buffer (which should be a sliced version of `chunk_info.ckData`) is used to parse child chunks. The default implementation will return `null` for unknown chunks (meaning they become `DataChunk`s).

All the properties from `additionalData` will be copied into the created chunk object.

## Utilities

There are currently two utility functions that can be accessed using `require('iff-parser').utils`.

### unpack(bufferprops = {buffer, offset}, compression, length)

`unpack` will return a new buffer derived from the current buffer in bufferprops and the given compression schemes, resulting in a buffer of `length` bytes. bufferprops.offset will be updated accordingly. Currently, the supported values for `compression` are `"cmpNone"` and `"cmpByteRun1"`.

### ilbm_canvas(file)

`ilbm_canvas` will try to load the iff-parsed file as ILBM (inter-leaved bitmap) into a new node-canvas, returning said canvas. Requires [node-canvas](https://github.com/LearnBoost/node-canvas) to be installed.

## To-Do

* Better robustness for incorrect buffer sizes in the header field.
* ilbm_canvas should support transparency (mskHasMask and mskHasTransparentColor)
* Parsing of SMUS music files…

## License

node-iff-parser is freely distributable under the terms of an MIT-style license.

Copyright (c) 2011 Raphael Schweikert, http://sabberworm.com/

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
