var HEAP,
/** @type {!Int8Array} */
  HEAP8,
/** @type {!Uint8Array} */
  HEAPU8,
/** @type {!Int16Array} */
  HEAP16,
/** @type {!Uint16Array} */
  HEAPU16,
/** @type {!Int32Array} */
  HEAP32,
/** @type {!Uint32Array} */
  HEAPU32,
/** @type {!Float32Array} */
  HEAPF32,
/** @type {!Float64Array} */
  HEAPF64;

const canvas = document.getElementById('canvasGl');
const GLctx = canvas.getContext('webgl2');
const UTF8Decoder = typeof TextDecoder != 'undefined' ? new TextDecoder('utf8') : undefined;

function updateMemoryViews(b) {
    HEAP8 = new Int8Array(b);
    HEAP16 = new Int16Array(b);
    HEAP32 = new Int32Array(b);
    HEAPU8 = new Uint8Array(b);
    HEAPU16 = new Uint16Array(b);
    HEAPU32 = new Uint32Array(b);
    HEAPF32 = new Float32Array(b);
    HEAPF64 = new Float64Array(b);
}

function UTF8ArrayToString(heapOrArray, idx, maxBytesToRead) {
    var endIdx = idx + maxBytesToRead;
    var endPtr = idx;
    // TextDecoder needs to know the byte length in advance, it doesn't stop on
    // null terminator by itself.  Also, use the length info to avoid running tiny
    // strings through TextDecoder, since .subarray() allocates garbage.
    // (As a tiny code save trick, compare endPtr against endIdx using a negation,
    // so that undefined means Infinity)
    while (heapOrArray[endPtr] && !(endPtr >= endIdx)) ++endPtr;

    if (endPtr - idx > 16 && heapOrArray.buffer && UTF8Decoder) {
        return UTF8Decoder.decode(heapOrArray.subarray(idx, endPtr));
    }
    var str = '';
    // If building with TextDecoder, we have already computed the string length
    // above, so test loop end condition against that
    while (idx < endPtr) {
        // For UTF8 byte structure, see:
        // http://en.wikipedia.org/wiki/UTF-8#Description
        // https://www.ietf.org/rfc/rfc2279.txt
        // https://tools.ietf.org/html/rfc3629
        var u0 = heapOrArray[idx++];
        if (!(u0 & 0x80)) { str += String.fromCharCode(u0); continue; }
        var u1 = heapOrArray[idx++] & 63;
        if ((u0 & 0xE0) == 0xC0) { str += String.fromCharCode(((u0 & 31) << 6) | u1); continue; }
        var u2 = heapOrArray[idx++] & 63;
        if ((u0 & 0xF0) == 0xE0) {
            u0 = ((u0 & 15) << 12) | (u1 << 6) | u2;
        } else {
            if ((u0 & 0xF8) != 0xF0) warnOnce('Invalid UTF-8 leading byte ' + ptrToString(u0) + ' encountered when deserializing a UTF-8 string in wasm memory to a JS string!');
            u0 = ((u0 & 7) << 18) | (u1 << 12) | (u2 << 6) | (heapOrArray[idx++] & 63);
        }

        if (u0 < 0x10000) {
            str += String.fromCharCode(u0);
        } else {
            var ch = u0 - 0x10000;
            str += String.fromCharCode(0xD800 | (ch >> 10), 0xDC00 | (ch & 0x3FF));
        }
    }
    return str;
}

function UTF8ToString(ptr, maxBytesToRead) {
    return ptr ? UTF8ArrayToString(HEAPU8, ptr, maxBytesToRead) : '';
}

var printCharBuffers = [null, [], []];
var out = console.log.bind(console);
var err = console.error.bind(console);

function printChar(stream, curr) {
    var buffer = printCharBuffers[stream];
    if (curr === 0 || curr === 10) {
      (stream === 1 ? out : err)(UTF8ArrayToString(buffer, 0));
      buffer.length = 0;
    } else {
      buffer.push(curr);
    }
}

function _fd_write(fd, iov, iovcnt, pnum) {
    // hack to support printf in SYSCALLS_REQUIRE_FILESYSTEM=0
    var num = 0;
    for (var i = 0; i < iovcnt; i++) {
      var ptr = HEAPU32[((iov)>>2)];
      var len = HEAPU32[(((iov)+(4))>>2)];
      iov += 8;
      for (var j = 0; j < len; j++) {
        printChar(fd, HEAPU8[ptr+j]);
      }
      num += len;
    }
    HEAPU32[((pnum)>>2)] = num;
    return 0;
}

function _fd_seek(fd, offset_low, offset_high, whence, newOffset) {
    return 70;
}

function _emscripten_memcpy_big(dest, src, num) {
    HEAPU8.copyWithin(dest, src, src + num);
}

function getHeapMax() {
    return HEAPU8.length;
}

function abortOnCannotGrowMemory(requestedSize) {
    abort(`Cannot enlarge memory arrays to size ${requestedSize} bytes (OOM). Either (1) compile with -sINITIAL_MEMORY=X with X higher than the current value ${HEAP8.length}, (2) compile with -sALLOW_MEMORY_GROWTH which allows increasing the size at runtime, or (3) if you want malloc to return NULL (0) instead of this abort, compile with -sABORTING_MALLOC=0`);
}
function _emscripten_resize_heap(requestedSize) {
    var oldSize = HEAPU8.length;
    requestedSize = requestedSize >>> 0;
    abortOnCannotGrowMemory(requestedSize);
}

function webgl_enable_ANGLE_instanced_arrays(ctx) {
    // Extension available in WebGL 1 from Firefox 26 and Google Chrome 30 onwards. Core feature in WebGL 2.
    var ext = ctx.getExtension('ANGLE_instanced_arrays');
    if (ext) {
        ctx['vertexAttribDivisor'] = function (index, divisor) { ext['vertexAttribDivisorANGLE'](index, divisor); };
        ctx['drawArraysInstanced'] = function (mode, first, count, primcount) { ext['drawArraysInstancedANGLE'](mode, first, count, primcount); };
        ctx['drawElementsInstanced'] = function (mode, count, type, indices, primcount) { ext['drawElementsInstancedANGLE'](mode, count, type, indices, primcount); };
        return 1;
    }
}

function webgl_enable_OES_vertex_array_object(ctx) {
    // Extension available in WebGL 1 from Firefox 25 and WebKit 536.28/desktop Safari 6.0.3 onwards. Core feature in WebGL 2.
    var ext = ctx.getExtension('OES_vertex_array_object');
    if (ext) {
        ctx['createVertexArray'] = function () { return ext['createVertexArrayOES'](); };
        ctx['deleteVertexArray'] = function (vao) { ext['deleteVertexArrayOES'](vao); };
        ctx['bindVertexArray'] = function (vao) { ext['bindVertexArrayOES'](vao); };
        ctx['isVertexArray'] = function (vao) { return ext['isVertexArrayOES'](vao); };
        return 1;
    }
}

function webgl_enable_WEBGL_draw_buffers(ctx) {
    // Extension available in WebGL 1 from Firefox 28 onwards. Core feature in WebGL 2.
    var ext = ctx.getExtension('WEBGL_draw_buffers');
    if (ext) {
        ctx['drawBuffers'] = function (n, bufs) { ext['drawBuffersWEBGL'](n, bufs); };
        return 1;
    }
}

function webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(ctx) {
    // Closure is expected to be allowed to minify the '.dibvbi' property, so not accessing it quoted.
    return !!(ctx.dibvbi = ctx.getExtension('WEBGL_draw_instanced_base_vertex_base_instance'));
}

function webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(ctx) {
    // Closure is expected to be allowed to minify the '.mdibvbi' property, so not accessing it quoted.
    return !!(ctx.mdibvbi = ctx.getExtension('WEBGL_multi_draw_instanced_base_vertex_base_instance'));
}

function webgl_enable_WEBGL_multi_draw(ctx) {
    // Closure is expected to be allowed to minify the '.multiDrawWebgl' property, so not accessing it quoted.
    return !!(ctx.multiDrawWebgl = ctx.getExtension('WEBGL_multi_draw'));
}


var GL = {
    counter: 1, buffers: [], programs: [], framebuffers: [], renderbuffers: [], textures: [], shaders: [], vaos: [], contexts: [], offscreenCanvases: {}, queries: [], samplers: [], transformFeedbacks: [], syncs: [], stringCache: {}, stringiCache: {}, unpackAlignment: 4, recordError: function recordError(errorCode) {
        if (!GL.lastError) {
            GL.lastError = errorCode;
        }
    }, getNewId: function (table) {
        var ret = GL.counter++;
        for (var i = table.length; i < ret; i++) {
            table[i] = null;
        }
        return ret;
    }, getSource: function (shader, count, string, length) {
        var source = '';
        for (var i = 0; i < count; ++i) {
            var len = length ? HEAP32[(((length) + (i * 4)) >> 2)] : -1;
            source += UTF8ToString(HEAP32[(((string) + (i * 4)) >> 2)], len < 0 ? undefined : len);
        }
        return source;
    }, createContext: function (/** @type {HTMLCanvasElement} */ canvas, webGLContextAttributes) {

        // BUG: Workaround Safari WebGL issue: After successfully acquiring WebGL context on a canvas,
        // calling .getContext() will always return that context independent of which 'webgl' or 'webgl2'
        // context version was passed. See https://bugs.webkit.org/show_bug.cgi?id=222758 and
        // https://github.com/emscripten-core/emscripten/issues/13295.
        // TODO: Once the bug is fixed and shipped in Safari, adjust the Safari version field in above check.
        if (!canvas.getContextSafariWebGL2Fixed) {
            canvas.getContextSafariWebGL2Fixed = canvas.getContext;
            /** @type {function(this:HTMLCanvasElement, string, (Object|null)=): (Object|null)} */
            function fixedGetContext(ver, attrs) {
                var gl = canvas.getContextSafariWebGL2Fixed(ver, attrs);
                return ((ver == 'webgl') == (gl instanceof WebGLRenderingContext)) ? gl : null;
            }
            canvas.getContext = fixedGetContext;
        }

        var ctx =
            (webGLContextAttributes.majorVersion > 1)
                ?
                canvas.getContext("webgl2", webGLContextAttributes)
                :
                (canvas.getContext("webgl", webGLContextAttributes)
                    // https://caniuse.com/#feat=webgl
                );

        if (!ctx) return 0;

        var handle = GL.registerContext(ctx, webGLContextAttributes);

        return handle;
    }, registerContext: function (ctx, webGLContextAttributes) {
        // without pthreads a context is just an integer ID
        var handle = GL.getNewId(GL.contexts);

        var context = {
            handle: handle,
            attributes: webGLContextAttributes,
            version: webGLContextAttributes.majorVersion,
            GLctx: ctx
        };

        // Store the created context object so that we can access the context given a canvas without having to pass the parameters again.
        if (ctx.canvas) ctx.canvas.GLctxObject = context;
        GL.contexts[handle] = context;
        if (typeof webGLContextAttributes.enableExtensionsByDefault == 'undefined' || webGLContextAttributes.enableExtensionsByDefault) {
            GL.initExtensions(context);
        }

        return handle;
    }, makeContextCurrent: function (contextHandle) {

        GL.currentContext = GL.contexts[contextHandle]; // Active Emscripten GL layer context object.
        Module.ctx = GLctx = GL.currentContext && GL.currentContext.GLctx; // Active WebGL context object.
        return !(contextHandle && !GLctx);
    }, getContext: function (contextHandle) {
        return GL.contexts[contextHandle];
    }, deleteContext: function (contextHandle) {
        if (GL.currentContext === GL.contexts[contextHandle]) GL.currentContext = null;
        if (typeof JSEvents == 'object') JSEvents.removeAllHandlersOnTarget(GL.contexts[contextHandle].GLctx.canvas); // Release all JS event handlers on the DOM element that the GL context is associated with since the context is now deleted.
        if (GL.contexts[contextHandle] && GL.contexts[contextHandle].GLctx.canvas) GL.contexts[contextHandle].GLctx.canvas.GLctxObject = undefined; // Make sure the canvas object no longer refers to the context object so there are no GC surprises.
        GL.contexts[contextHandle] = null;
    }, initExtensions: function (context) {
        // If this function is called without a specific context object, init the extensions of the currently active context.
        if (!context) context = GL.currentContext;

        if (context.initExtensionsDone) return;
        context.initExtensionsDone = true;

        var GLctx = context.GLctx;

        // Detect the presence of a few extensions manually, this GL interop layer itself will need to know if they exist.

        // Extensions that are only available in WebGL 1 (the calls will be no-ops if called on a WebGL 2 context active)
        webgl_enable_ANGLE_instanced_arrays(GLctx);
        webgl_enable_OES_vertex_array_object(GLctx);
        webgl_enable_WEBGL_draw_buffers(GLctx);
        // Extensions that are available from WebGL >= 2 (no-op if called on a WebGL 1 context active)
        webgl_enable_WEBGL_draw_instanced_base_vertex_base_instance(GLctx);
        webgl_enable_WEBGL_multi_draw_instanced_base_vertex_base_instance(GLctx);

        // On WebGL 2, EXT_disjoint_timer_query is replaced with an alternative
        // that's based on core APIs, and exposes only the queryCounterEXT()
        // entrypoint.
        if (context.version >= 2) {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query_webgl2");
        }

        // However, Firefox exposes the WebGL 1 version on WebGL 2 as well and
        // thus we look for the WebGL 1 version again if the WebGL 2 version
        // isn't present. https://bugzilla.mozilla.org/show_bug.cgi?id=1328882
        if (context.version < 2 || !GLctx.disjointTimerQueryExt) {
            GLctx.disjointTimerQueryExt = GLctx.getExtension("EXT_disjoint_timer_query");
        }

        webgl_enable_WEBGL_multi_draw(GLctx);

        // .getSupportedExtensions() can return null if context is lost, so coerce to empty array.
        var exts = GLctx.getSupportedExtensions() || [];
        exts.forEach(function (ext) {
            // WEBGL_lose_context, WEBGL_debug_renderer_info and WEBGL_debug_shaders are not enabled by default.
            if (!ext.includes('lose_context') && !ext.includes('debug')) {
                // Call .getExtension() to enable that extension permanently.
                GLctx.getExtension(ext);
            }
        });
    }
};
function _glAttachShader(program, shader) {
    GLctx.attachShader(GL.programs[program], GL.shaders[shader]);
}

function _glBindBuffer(target, buffer) {

    if (target == 0x88EB /*GL_PIXEL_PACK_BUFFER*/) {
        // In WebGL 2 glReadPixels entry point, we need to use a different WebGL 2 API function call when a buffer is bound to
        // GL_PIXEL_PACK_BUFFER_BINDING point, so must keep track whether that binding point is non-null to know what is
        // the proper API function to call.
        GLctx.currentPixelPackBufferBinding = buffer;
    } else if (target == 0x88EC /*GL_PIXEL_UNPACK_BUFFER*/) {
        // In WebGL 2 gl(Compressed)Tex(Sub)Image[23]D entry points, we need to
        // use a different WebGL 2 API function call when a buffer is bound to
        // GL_PIXEL_UNPACK_BUFFER_BINDING point, so must keep track whether that
        // binding point is non-null to know what is the proper API function to
        // call.
        GLctx.currentPixelUnpackBufferBinding = buffer;
    }
    GLctx.bindBuffer(target, GL.buffers[buffer]);
}

function _glBindFramebuffer(target, framebuffer) {

    GLctx.bindFramebuffer(target, GL.framebuffers[framebuffer]);

}

function _glBindRenderbuffer(target, renderbuffer) {
    GLctx.bindRenderbuffer(target, GL.renderbuffers[renderbuffer]);
}

function _glBindTexture(target, texture) {
    GLctx.bindTexture(target, GL.textures[texture]);
}

function _glBindVertexArray(vao) {
    GLctx.bindVertexArray(GL.vaos[vao]);
}

function _glBufferData(target, size, data, usage) {

    // If size is zero, WebGL would interpret uploading the whole input arraybuffer (starting from given offset), which would
    // not make sense in WebAssembly, so avoid uploading if size is zero. However we must still call bufferData to establish a
    // backing storage of zero bytes.
    if (data && size) {
        GLctx.bufferData(target, HEAPU8, usage, data, size);
    } else {
        GLctx.bufferData(target, size, usage);
    }
}

function _glCheckFramebufferStatus(x0) {
    return GLctx.checkFramebufferStatus(x0)
}

function _glClear(x0) {
    GLctx.clear(x0)
}

function _glClearColor(x0, x1, x2, x3) {
    GLctx.clearColor(x0, x1, x2, x3)
}

function _glCompileShader(shader) {
    GLctx.compileShader(GL.shaders[shader]);
}

function _glCreateProgram() {
    var id = GL.getNewId(GL.programs);
    var program = GLctx.createProgram();
    // Store additional information needed for each shader program:
    program.name = id;
    // Lazy cache results of glGetProgramiv(GL_ACTIVE_UNIFORM_MAX_LENGTH/GL_ACTIVE_ATTRIBUTE_MAX_LENGTH/GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH)
    program.maxUniformLength = program.maxAttributeLength = program.maxUniformBlockNameLength = 0;
    program.uniformIdCounter = 1;
    GL.programs[id] = program;
    return id;
}

function _glCreateShader(shaderType) {
    var id = GL.getNewId(GL.shaders);
    GL.shaders[id] = GLctx.createShader(shaderType);

    return id;
}

function _glDeleteShader(id) {
    if (!id) return;
    var shader = GL.shaders[id];
    if (!shader) { // glDeleteShader actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
    }
    GLctx.deleteShader(shader);
    GL.shaders[id] = null;
}

function _glDrawElements(mode, count, type, indices) {

    GLctx.drawElements(mode, count, type, indices);

}

function _glEnableVertexAttribArray(index) {
    GLctx.enableVertexAttribArray(index);
}

function _glFramebufferRenderbuffer(target, attachment, renderbuffertarget, renderbuffer) {
    GLctx.framebufferRenderbuffer(target, attachment, renderbuffertarget,
        GL.renderbuffers[renderbuffer]);
}

function _glFramebufferTexture2D(target, attachment, textarget, texture, level) {
    GLctx.framebufferTexture2D(target, attachment, textarget,
        GL.textures[texture], level);
}

function __glGenObject(n, buffers, createFunction, objectTable) {
    for (var i = 0; i < n; i++) {
        var buffer = GLctx[createFunction]();
        var id = buffer && GL.getNewId(objectTable);
        if (buffer) {
            buffer.name = id;
            objectTable[id] = buffer;
        } else {
            GL.recordError(0x502 /* GL_INVALID_OPERATION */);
        }
        HEAP32[(((buffers) + (i * 4)) >> 2)] = id;
    }
}

function _glGenBuffers(n, buffers) {
    __glGenObject(n, buffers, 'createBuffer', GL.buffers
    );
}


function _glGenFramebuffers(n, ids) {
    __glGenObject(n, ids, 'createFramebuffer', GL.framebuffers
    );
}


function _glGenRenderbuffers(n, renderbuffers) {
    __glGenObject(n, renderbuffers, 'createRenderbuffer', GL.renderbuffers
    );
}


function _glGenTextures(n, textures) {
    __glGenObject(n, textures, 'createTexture', GL.textures
    );
}


function _glGenVertexArrays(n, arrays) {
    __glGenObject(n, arrays, 'createVertexArray', GL.vaos
    );
}

function _glGetProgramInfoLog(program, maxLength, length, infoLog) {
    var log = GLctx.getProgramInfoLog(GL.programs[program]);
    if (log === null) log = '(unknown error)';
    var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[((length) >> 2)] = numBytesWrittenExclNull;
}

function _glGetProgramiv(program, pname, p) {
    if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
    }

    if (program >= GL.counter) {
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
    }

    program = GL.programs[program];

    if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getProgramInfoLog(program);
        if (log === null) log = '(unknown error)';
        HEAP32[((p) >> 2)] = log.length + 1;
    } else if (pname == 0x8B87 /* GL_ACTIVE_UNIFORM_MAX_LENGTH */) {
        if (!program.maxUniformLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/); ++i) {
                program.maxUniformLength = Math.max(program.maxUniformLength, GLctx.getActiveUniform(program, i).name.length + 1);
            }
        }
        HEAP32[((p) >> 2)] = program.maxUniformLength;
    } else if (pname == 0x8B8A /* GL_ACTIVE_ATTRIBUTE_MAX_LENGTH */) {
        if (!program.maxAttributeLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 0x8B89/*GL_ACTIVE_ATTRIBUTES*/); ++i) {
                program.maxAttributeLength = Math.max(program.maxAttributeLength, GLctx.getActiveAttrib(program, i).name.length + 1);
            }
        }
        HEAP32[((p) >> 2)] = program.maxAttributeLength;
    } else if (pname == 0x8A35 /* GL_ACTIVE_UNIFORM_BLOCK_MAX_NAME_LENGTH */) {
        if (!program.maxUniformBlockNameLength) {
            for (var i = 0; i < GLctx.getProgramParameter(program, 0x8A36/*GL_ACTIVE_UNIFORM_BLOCKS*/); ++i) {
                program.maxUniformBlockNameLength = Math.max(program.maxUniformBlockNameLength, GLctx.getActiveUniformBlockName(program, i).length + 1);
            }
        }
        HEAP32[((p) >> 2)] = program.maxUniformBlockNameLength;
    } else {
        HEAP32[((p) >> 2)] = GLctx.getProgramParameter(program, pname);
    }
}

function stringToUTF8Array(str, heap, outIdx, maxBytesToWrite) {
    // Parameter maxBytesToWrite is not optional. Negative values, 0, null,
    // undefined and false each don't write out any bytes.
    if (!(maxBytesToWrite > 0))
        return 0;

    var startIdx = outIdx;
    var endIdx = outIdx + maxBytesToWrite - 1; // -1 for string null terminator.
    for (var i = 0; i < str.length; ++i) {
        // Gotcha: charCodeAt returns a 16-bit word that is a UTF-16 encoded code
        // unit, not a Unicode code point of the character! So decode
        // UTF16->UTF32->UTF8.
        // See http://unicode.org/faq/utf_bom.html#utf16-3
        // For UTF8 byte structure, see http://en.wikipedia.org/wiki/UTF-8#Description
        // and https://www.ietf.org/rfc/rfc2279.txt
        // and https://tools.ietf.org/html/rfc3629
        var u = str.charCodeAt(i); // possibly a lead surrogate
        if (u >= 0xD800 && u <= 0xDFFF) {
            var u1 = str.charCodeAt(++i);
            u = 0x10000 + ((u & 0x3FF) << 10) | (u1 & 0x3FF);
        }
        if (u <= 0x7F) {
            if (outIdx >= endIdx) break;
            heap[outIdx++] = u;
        } else if (u <= 0x7FF) {
            if (outIdx + 1 >= endIdx) break;
            heap[outIdx++] = 0xC0 | (u >> 6);
            heap[outIdx++] = 0x80 | (u & 63);
        } else if (u <= 0xFFFF) {
            if (outIdx + 2 >= endIdx) break;
            heap[outIdx++] = 0xE0 | (u >> 12);
            heap[outIdx++] = 0x80 | ((u >> 6) & 63);
            heap[outIdx++] = 0x80 | (u & 63);
        } else {
            if (outIdx + 3 >= endIdx) break;
            if (u > 0x10FFFF) warnOnce('Invalid Unicode code point ' + ptrToString(u) + ' encountered when serializing a JS string to a UTF-8 string in wasm memory! (Valid unicode code points should be in range 0-0x10FFFF).');
            heap[outIdx++] = 0xF0 | (u >> 18);
            heap[outIdx++] = 0x80 | ((u >> 12) & 63);
            heap[outIdx++] = 0x80 | ((u >> 6) & 63);
            heap[outIdx++] = 0x80 | (u & 63);
        }
    }
    // Null-terminate the pointer to the buffer.
    heap[outIdx] = 0;
    return outIdx - startIdx;
}

function stringToUTF8(str, outPtr, maxBytesToWrite) {
    return stringToUTF8Array(str, HEAPU8, outPtr, maxBytesToWrite);
}

function _glGetShaderInfoLog(shader, maxLength, length, infoLog) {
    var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
    if (log === null) log = '(unknown error)';
    var numBytesWrittenExclNull = (maxLength > 0 && infoLog) ? stringToUTF8(log, infoLog, maxLength) : 0;
    if (length) HEAP32[((length) >> 2)] = numBytesWrittenExclNull;
}

function _glGetShaderiv(shader, pname, p) {
    if (!p) {
        // GLES2 specification does not specify how to behave if p is a null pointer. Since calling this function does not make sense
        // if p == null, issue a GL error to notify user about it.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
    }
    if (pname == 0x8B84) { // GL_INFO_LOG_LENGTH
        var log = GLctx.getShaderInfoLog(GL.shaders[shader]);
        if (log === null) log = '(unknown error)';
        // The GLES2 specification says that if the shader has an empty info log,
        // a value of 0 is returned. Otherwise the log has a null char appended.
        // (An empty string is falsey, so we can just check that instead of
        // looking at log.length.)
        var logLength = log ? log.length + 1 : 0;
        HEAP32[((p) >> 2)] = logLength;
    } else if (pname == 0x8B88) { // GL_SHADER_SOURCE_LENGTH
        var source = GLctx.getShaderSource(GL.shaders[shader]);
        // source may be a null, or the empty string, both of which are falsey
        // values that we report a 0 length for.
        var sourceLength = source ? source.length + 1 : 0;
        HEAP32[((p) >> 2)] = sourceLength;
    } else {
        HEAP32[((p) >> 2)] = GLctx.getShaderParameter(GL.shaders[shader], pname);
    }
}

/** @suppress {checkTypes} */
function jstoi_q(str) {
    return parseInt(str);
}

/** @noinline */
function webglGetLeftBracePos(name) {
    return name.slice(-1) == ']' && name.lastIndexOf('[');
}

function webglPrepareUniformLocationsBeforeFirstUse(program) {
    var uniformLocsById = program.uniformLocsById, // Maps GLuint -> WebGLUniformLocation
        uniformSizeAndIdsByName = program.uniformSizeAndIdsByName, // Maps name -> [uniform array length, GLuint]
        i, j;

    // On the first time invocation of glGetUniformLocation on this shader program:
    // initialize cache data structures and discover which uniforms are arrays.
    if (!uniformLocsById) {
        // maps GLint integer locations to WebGLUniformLocations
        program.uniformLocsById = uniformLocsById = {};
        // maps integer locations back to uniform name strings, so that we can lazily fetch uniform array locations
        program.uniformArrayNamesById = {};

        for (i = 0; i < GLctx.getProgramParameter(program, 0x8B86/*GL_ACTIVE_UNIFORMS*/); ++i) {
            var u = GLctx.getActiveUniform(program, i);
            var nm = u.name;
            var sz = u.size;
            var lb = webglGetLeftBracePos(nm);
            var arrayName = lb > 0 ? nm.slice(0, lb) : nm;

            // Assign a new location.
            var id = program.uniformIdCounter;
            program.uniformIdCounter += sz;
            // Eagerly get the location of the uniformArray[0] base element.
            // The remaining indices >0 will be left for lazy evaluation to
            // improve performance. Those may never be needed to fetch, if the
            // application fills arrays always in full starting from the first
            // element of the array.
            uniformSizeAndIdsByName[arrayName] = [sz, id];

            // Store placeholder integers in place that highlight that these
            // >0 index locations are array indices pending population.
            for (j = 0; j < sz; ++j) {
                uniformLocsById[id] = j;
                program.uniformArrayNamesById[id++] = arrayName;
            }
        }
    }
}



function _glGetUniformLocation(program, name) {

    name = UTF8ToString(name);

    if (program = GL.programs[program]) {
        webglPrepareUniformLocationsBeforeFirstUse(program);
        var uniformLocsById = program.uniformLocsById; // Maps GLuint -> WebGLUniformLocation
        var arrayIndex = 0;
        var uniformBaseName = name;

        // Invariant: when populating integer IDs for uniform locations, we must maintain the precondition that
        // arrays reside in contiguous addresses, i.e. for a 'vec4 colors[10];', colors[4] must be at location colors[0]+4.
        // However, user might call glGetUniformLocation(program, "colors") for an array, so we cannot discover based on the user
        // input arguments whether the uniform we are dealing with is an array. The only way to discover which uniforms are arrays
        // is to enumerate over all the active uniforms in the program.
        var leftBrace = webglGetLeftBracePos(name);

        // If user passed an array accessor "[index]", parse the array index off the accessor.
        if (leftBrace > 0) {
            arrayIndex = jstoi_q(name.slice(leftBrace + 1)) >>> 0; // "index]", coerce parseInt(']') with >>>0 to treat "foo[]" as "foo[0]" and foo[-1] as unsigned out-of-bounds.
            uniformBaseName = name.slice(0, leftBrace);
        }

        // Have we cached the location of this uniform before?
        var sizeAndId = program.uniformSizeAndIdsByName[uniformBaseName]; // A pair [array length, GLint of the uniform location]

        // If an uniform with this name exists, and if its index is within the array limits (if it's even an array),
        // query the WebGLlocation, or return an existing cached location.
        if (sizeAndId && arrayIndex < sizeAndId[0]) {
            arrayIndex += sizeAndId[1]; // Add the base location of the uniform to the array index offset.
            if ((uniformLocsById[arrayIndex] = uniformLocsById[arrayIndex] || GLctx.getUniformLocation(program, name))) {
                return arrayIndex;
            }
        }
    }
    else {
        // N.b. we are currently unable to distinguish between GL program IDs that never existed vs GL program IDs that have been deleted,
        // so report GL_INVALID_VALUE in both cases.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
    }
    return -1;
}

function _glLinkProgram(program) {
    program = GL.programs[program];
    GLctx.linkProgram(program);
    // Invalidate earlier computed uniform->ID mappings, those have now become stale
    program.uniformLocsById = 0; // Mark as null-like so that glGetUniformLocation() knows to populate this again.
    program.uniformSizeAndIdsByName = {};

}

function _glRenderbufferStorage(x0, x1, x2, x3) { GLctx.renderbufferStorage(x0, x1, x2, x3) }

function _glShaderSource(shader, count, string, length) {
    var source = GL.getSource(shader, count, string, length);

    GLctx.shaderSource(GL.shaders[shader], source);
}

function computeUnpackAlignedImageSize(width, height, sizePerPixel, alignment) {
    function roundedToNextMultipleOf(x, y) {
        return (x + y - 1) & -y;
    }
    var plainRowSize = width * sizePerPixel;
    var alignedRowSize = roundedToNextMultipleOf(plainRowSize, alignment);
    return height * alignedRowSize;
}

function colorChannelsInGlTextureFormat(format) {
    // Micro-optimizations for size: map format to size by subtracting smallest enum value (0x1902) from all values first.
    // Also omit the most common size value (1) from the list, which is assumed by formats not on the list.
    var colorChannels = {
        // 0x1902 /* GL_DEPTH_COMPONENT */ - 0x1902: 1,
        // 0x1906 /* GL_ALPHA */ - 0x1902: 1,
        5: 3,
        6: 4,
        // 0x1909 /* GL_LUMINANCE */ - 0x1902: 1,
        8: 2,
        29502: 3,
        29504: 4,
        // 0x1903 /* GL_RED */ - 0x1902: 1,
        26917: 2,
        26918: 2,
        // 0x8D94 /* GL_RED_INTEGER */ - 0x1902: 1,
        29846: 3,
        29847: 4
    };
    return colorChannels[format - 0x1902] || 1;
}

function heapObjectForWebGLType(type) {
    // Micro-optimization for size: Subtract lowest GL enum number (0x1400/* GL_BYTE */) from type to compare
    // smaller values for the heap, for shorter generated code size.
    // Also the type HEAPU16 is not tested for explicitly, but any unrecognized type will return out HEAPU16.
    // (since most types are HEAPU16)
    type -= 0x1400;
    if (type == 0) return HEAP8;

    if (type == 1) return HEAPU8;

    if (type == 2) return HEAP16;

    if (type == 4) return HEAP32;

    if (type == 6) return HEAPF32;

    if (type == 5
        || type == 28922
        || type == 28520
        || type == 30779
        || type == 30782
    )
        return HEAPU32;

    return HEAPU16;
}

function heapAccessShiftForWebGLHeap(heap) {
    return 31 - Math.clz32(heap.BYTES_PER_ELEMENT);
}

function emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) {
    var heap = heapObjectForWebGLType(type);
    var shift = heapAccessShiftForWebGLHeap(heap);
    var byteSize = 1 << shift;
    var sizePerPixel = colorChannelsInGlTextureFormat(format) * byteSize;
    var bytes = computeUnpackAlignedImageSize(width, height, sizePerPixel, GL.unpackAlignment);
    return heap.subarray(pixels >> shift, pixels + bytes >> shift);
}

function _glTexImage2D(target, level, internalFormat, width, height, border, format, type, pixels) {
    if (true) {
        // WebGL 2 provides new garbage-free entry points to call to WebGL. Use those always when possible.
        if (GLctx.currentPixelUnpackBufferBinding) {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels);
        } else if (pixels) {
            var heap = heapObjectForWebGLType(type);
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap));
        } else {
            GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, null);
        }
        return;
    }
    GLctx.texImage2D(target, level, internalFormat, width, height, border, format, type, pixels ? emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, internalFormat) : null);
}

function webglGetUniformLocation(location) {
    var p = GLctx.currentProgram;

    if (p) {
        var webglLoc = p.uniformLocsById[location];
        // p.uniformLocsById[location] stores either an integer, or a WebGLUniformLocation.

        // If an integer, we have not yet bound the location, so do it now. The integer value specifies the array index
        // we should bind to.
        if (typeof webglLoc == 'number') {
            p.uniformLocsById[location] = webglLoc = GLctx.getUniformLocation(p, p.uniformArrayNamesById[location] + (webglLoc > 0 ? '[' + webglLoc + ']' : ''));
        }
        // Else an already cached WebGLUniformLocation, return it.
        return webglLoc;
    } else {
        GL.recordError(0x502/*GL_INVALID_OPERATION*/);
    }
}

var miniTempWebGLFloatBuffers = [];

function _glUniformMatrix4fv(location, count, transpose, value) {

    if (true) { // WebGL 2 provides new garbage-free entry points to call to WebGL. Use those always when possible.
        count && GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, HEAPF32, value >> 2, count * 16);
        return;
    }

    if (count <= 18) {
        // avoid allocation when uploading few enough uniforms
        var view = miniTempWebGLFloatBuffers[16 * count - 1];
        // hoist the heap out of the loop for size and for pthreads+growth.
        var heap = HEAPF32;
        value >>= 2;
        for (var i = 0; i < 16 * count; i += 16) {
            var dst = value + i;
            view[i] = heap[dst];
            view[i + 1] = heap[dst + 1];
            view[i + 2] = heap[dst + 2];
            view[i + 3] = heap[dst + 3];
            view[i + 4] = heap[dst + 4];
            view[i + 5] = heap[dst + 5];
            view[i + 6] = heap[dst + 6];
            view[i + 7] = heap[dst + 7];
            view[i + 8] = heap[dst + 8];
            view[i + 9] = heap[dst + 9];
            view[i + 10] = heap[dst + 10];
            view[i + 11] = heap[dst + 11];
            view[i + 12] = heap[dst + 12];
            view[i + 13] = heap[dst + 13];
            view[i + 14] = heap[dst + 14];
            view[i + 15] = heap[dst + 15];
        }
    } else {
        var view = HEAPF32.subarray((value) >> 2, (value + count * 64) >> 2);
    }
    GLctx.uniformMatrix4fv(webglGetUniformLocation(location), !!transpose, view);
}

function _glUseProgram(program) {
    program = GL.programs[program];
    GLctx.useProgram(program);
    // Record the currently active program so that we can access the uniform
    // mapping table of that program.
    GLctx.currentProgram = program;
}

function _glValidateProgram(program) {
    GLctx.validateProgram(GL.programs[program]);
}

function _glVertexAttribPointer(index, size, type, normalized, stride, ptr) {
    GLctx.vertexAttribPointer(index, size, type, !!normalized, stride, ptr);
}

function _glViewport(x0, x1, x2, x3) { GLctx.viewport(x0, x1, x2, x3) }

function _glDeleteProgram(id) {
    if (!id) return;
    var program = GL.programs[id];
    if (!program) { // glDeleteProgram actually signals an error when deleting a nonexisting object, unlike some other GL delete functions.
        GL.recordError(0x501 /* GL_INVALID_VALUE */);
        return;
    }
    GLctx.deleteProgram(program);
    program.name = 0;
    GL.programs[id] = null;
}

function _glReadPixels(x, y, width, height, format, type, pixels) {
    if (true) { // WebGL 2 provides new garbage-free entry points to call to WebGL. Use those always when possible.
        if (GLctx.currentPixelPackBufferBinding) {
            GLctx.readPixels(x, y, width, height, format, type, pixels);
        } else {
            var heap = heapObjectForWebGLType(type);
            GLctx.readPixels(x, y, width, height, format, type, heap, pixels >> heapAccessShiftForWebGLHeap(heap));
        }
        return;
    }
    var pixelData = emscriptenWebGLGetTexPixelData(type, format, width, height, pixels, format);
    if (!pixelData) {
        GL.recordError(0x500/*GL_INVALID_ENUM*/);
        return;
    }
    GLctx.readPixels(x, y, width, height, format, type, pixelData);
}

function _glTexParameteri(x0, x1, x2) {
    GLctx.texParameteri(x0, x1, x2)
}

function _glDeleteVertexArrays(n, vaos) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[(((vaos) + (i * 4)) >> 2)];
        GLctx.deleteVertexArray(GL.vaos[id]);
        GL.vaos[id] = null;
    }
}

function _glDeleteBuffers(n, buffers) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[(((buffers) + (i * 4)) >> 2)];
        var buffer = GL.buffers[id];

        // From spec: "glDeleteBuffers silently ignores 0's and names that do not
        // correspond to existing buffer objects."
        if (!buffer) continue;

        GLctx.deleteBuffer(buffer);
        buffer.name = 0;
        GL.buffers[id] = null;

        if (id == GLctx.currentPixelPackBufferBinding) GLctx.currentPixelPackBufferBinding = 0;
        if (id == GLctx.currentPixelUnpackBufferBinding) GLctx.currentPixelUnpackBufferBinding = 0;
    }
}

function _glDeleteFramebuffers(n, framebuffers) {
    for (var i = 0; i < n; ++i) {
        var id = HEAP32[(((framebuffers) + (i * 4)) >> 2)];
        var framebuffer = GL.framebuffers[id];
        if (!framebuffer) continue; // GL spec: "glDeleteFramebuffers silently ignores 0s and names that do not correspond to existing framebuffer objects".
        GLctx.deleteFramebuffer(framebuffer);
        framebuffer.name = 0;
        GL.framebuffers[id] = null;
    }
}


function _glDeleteTextures(n, textures) {
    for (var i = 0; i < n; i++) {
        var id = HEAP32[(((textures) + (i * 4)) >> 2)];
        var texture = GL.textures[id];
        if (!texture) continue; // GL spec: "glDeleteTextures silently ignores 0s and names that do not correspond to existing textures".
        GLctx.deleteTexture(texture);
        texture.name = 0;
        GL.textures[id] = null;
    }
}

const wasmImports = {
    "emscripten_memcpy_big": _emscripten_memcpy_big,
    "emscripten_resize_heap": _emscripten_resize_heap,
    "fd_close": (_) => { },
    "fd_seek": _fd_seek,
    "fd_write": _fd_write,
    "glAttachShader": _glAttachShader,
    "glBindBuffer": _glBindBuffer,
    "glBindFramebuffer": _glBindFramebuffer,
    "glBindRenderbuffer": _glBindRenderbuffer,
    "glBindTexture": _glBindTexture,
    "glBindVertexArray": _glBindVertexArray,
    "glBufferData": _glBufferData,
    "glCheckFramebufferStatus": _glCheckFramebufferStatus,
    "glClear": _glClear,
    "glClearColor": _glClearColor,
    "glCompileShader": _glCompileShader,
    "glCreateProgram": _glCreateProgram,
    "glCreateShader": _glCreateShader,
    "glDeleteShader": _glDeleteShader,
    "glDrawElements": _glDrawElements,
    "glEnableVertexAttribArray": _glEnableVertexAttribArray,
    "glFramebufferRenderbuffer": _glFramebufferRenderbuffer,
    "glFramebufferTexture2D": _glFramebufferTexture2D,
    "glGenBuffers": _glGenBuffers,
    "glGenFramebuffers": _glGenFramebuffers,
    "glGenRenderbuffers": _glGenRenderbuffers,
    "glGenTextures": _glGenTextures,
    "glGenVertexArrays": _glGenVertexArrays,
    "glGetProgramInfoLog": _glGetProgramInfoLog,
    "glGetProgramiv": _glGetProgramiv,
    "glGetShaderInfoLog": _glGetShaderInfoLog,
    "glGetShaderiv": _glGetShaderiv,
    "glGetUniformLocation": _glGetUniformLocation,
    "glLinkProgram": _glLinkProgram,
    "glRenderbufferStorage": _glRenderbufferStorage,
    "glShaderSource": _glShaderSource,
    "glTexImage2D": _glTexImage2D,
    "glUniformMatrix4fv": _glUniformMatrix4fv,
    "glUseProgram": _glUseProgram,
    "glValidateProgram": _glValidateProgram,
    "glVertexAttribPointer": _glVertexAttribPointer,
    "glViewport": _glViewport,
    "glDeleteProgram": _glDeleteProgram,
    "glReadPixels": _glReadPixels,
    "glTexParameteri": _glTexParameteri,
    "glDeleteVertexArrays": _glDeleteVertexArrays,
    "glDeleteBuffers": _glDeleteBuffers,
    "glDeleteFramebuffers": _glDeleteFramebuffers,
    "glDeleteTextures": _glDeleteTextures,
};

const vertexSource = `#version 300 es
precision mediump float;
in vec2 a_Pos;
in vec3 a_Color;
uniform mat4 u_Model;
out vec4 v_Color;

void main()
{
    gl_Position = u_Model * vec4(a_Pos.x, a_Pos.y, 0.0, 1.0);
    v_Color = vec4(a_Color, 1.0);
}`;

const fragSource = `#version 300 es
precision mediump float;
in vec4 v_Color;
out vec4 o_Color;

void main()
{
   o_Color = v_Color;
}`;

var memory, malloc, free;
const allocations = new Map();

function cStrCreate(str) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(str);
    const ptr = malloc(bytes.byteLength);
    const buffer = new Uint8Array(memory.buffer, ptr, bytes.byteLength + 1);
    buffer.set(bytes);

    allocations.set(buffer, ptr);
    return buffer;
}

function cStrFree(buffer) {
    const ptr = allocations.get(buffer);
    if (ptr)
        free(ptr);
    allocations.delete(buffer);
}

async function run() {
    const module = await WebAssembly.instantiateStreaming(fetch('OpenGL.wasm'), {
        'env': wasmImports,
        'wasi_snapshot_preview1': wasmImports,
    });

    const exports = module.instance.exports;

    // Load memory variables
    memory = exports.memory;
    malloc = exports.MyMalloc;
    free = exports.MyFree;

    // Load heaps
    updateMemoryViews(exports.memory.buffer);

    // Set shutdown callback
    window.addEventListener('beforeunload', (e) => {
        exports.MyShutdown();
    });

    // Create C strings to pass to Init with the Shader source code
    const vert = cStrCreate(vertexSource);
    const frag = cStrCreate(fragSource);

    if (!exports.MyInit(vert.byteOffset, frag.byteOffset)) {
        console.error("Failed to init MainWASM");
        return;
    }

    // Free the strings
    cStrFree(vert);
    cStrFree(frag);

    console.log("MainWASM initialized successfully");

    // Get the canvas that will be used to display the pixels
    const canvasRender = document.getElementById("canvasRender");
    const myCtx = canvasRender.getContext("2d");

    let previousTime = 0;
    function render(currentTime) {
        // Calculate the delta time
        const deltaTime = (currentTime - previousTime) / 1000;
        previousTime = currentTime;

        // Call Render and get the pixels from the framebuffer
        const pixels = exports.MyRender(deltaTime);

        const framebufferWidth = 800;
        const framebufferHeight = 600;
        const length = framebufferWidth * framebufferHeight * 4;

        // Convert the pixels into an image data and set them in the canvas
        const imageData = new ImageData(new Uint8ClampedArray(HEAPU8.buffer, pixels, length), framebufferWidth);
        myCtx.putImageData(imageData, 0, 0);

        // Request the next frame
        window.requestAnimationFrame(render);
    }

    // Start the render loop
    window.requestAnimationFrame(render);
}