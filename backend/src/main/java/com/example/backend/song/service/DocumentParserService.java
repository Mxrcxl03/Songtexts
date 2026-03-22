package com.example.backend.song.service;

import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.CharacterCodingException;
import java.nio.charset.Charset;
import java.nio.charset.CharsetDecoder;
import java.nio.charset.CodingErrorAction;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class DocumentParserService {

    private static final Charset WINDOWS_1252 = Charset.forName("windows-1252");
    private static final Pattern META_CHARSET_PATTERN = Pattern.compile(
            "(?i)<meta[^>]*charset\\s*=\\s*['\"]?([a-zA-Z0-9_\\-]+)");
    private static final Pattern META_CONTENT_TYPE_CHARSET_PATTERN = Pattern.compile(
            "(?i)<meta[^>]*http-equiv\\s*=\\s*['\"]content-type['\"][^>]*content\\s*=\\s*['\"][^'\"]*charset=([a-zA-Z0-9_\\-]+)");

    public String parseHtmlFile(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("File cannot be empty");
        }

        String filename = file.getOriginalFilename();
        if (filename == null) {
            throw new IllegalArgumentException("File must have a name");
        }

        String lower = filename.toLowerCase(Locale.ROOT);
        if (!lower.endsWith(".htm")) {
            throw new IllegalArgumentException("Unsupported file type. Please upload only .htm files");
        }

        byte[] bytes = file.getBytes();
        String content = decodeHtml(bytes);

        if (content.isBlank()) {
            throw new IllegalArgumentException("Uploaded .htm file is empty");
        }

        return content;
    }

    private String decodeHtml(byte[] bytes) {
        List<Charset> candidates = new ArrayList<>();
        Charset fromBom = detectBomCharset(bytes);
        if (fromBom != null) {
            candidates.add(fromBom);
        }

        Charset fromMeta = detectCharsetFromMeta(bytes);
        if (fromMeta != null) {
            candidates.add(fromMeta);
        }

        candidates.add(StandardCharsets.UTF_8);
        candidates.add(WINDOWS_1252);
        candidates.add(StandardCharsets.ISO_8859_1);

        Set<String> seen = new LinkedHashSet<>();
        for (Charset charset : candidates) {
            String key = charset.name().toLowerCase(Locale.ROOT);
            if (!seen.add(key)) {
                continue;
            }
            try {
                return decodeStrict(bytes, charset);
            } catch (CharacterCodingException ignored) {
                // Try next candidate charset.
            }
        }

        return new String(bytes, StandardCharsets.UTF_8);
    }

    private Charset detectBomCharset(byte[] bytes) {
        if (bytes.length >= 3
                && (bytes[0] & 0xFF) == 0xEF
                && (bytes[1] & 0xFF) == 0xBB
                && (bytes[2] & 0xFF) == 0xBF) {
            return StandardCharsets.UTF_8;
        }
        if (bytes.length >= 2
                && (bytes[0] & 0xFF) == 0xFE
                && (bytes[1] & 0xFF) == 0xFF) {
            return StandardCharsets.UTF_16BE;
        }
        if (bytes.length >= 2
                && (bytes[0] & 0xFF) == 0xFF
                && (bytes[1] & 0xFF) == 0xFE) {
            return StandardCharsets.UTF_16LE;
        }
        return null;
    }

    private Charset detectCharsetFromMeta(byte[] bytes) {
        int sampleLength = Math.min(bytes.length, 4096);
        String head = new String(bytes, 0, sampleLength, StandardCharsets.ISO_8859_1);

        String charsetName = matchCharset(head, META_CHARSET_PATTERN);
        if (charsetName == null) {
            charsetName = matchCharset(head, META_CONTENT_TYPE_CHARSET_PATTERN);
        }

        if (charsetName == null) {
            return null;
        }

        try {
            return Charset.forName(charsetName.trim());
        } catch (Exception ignored) {
            return null;
        }
    }

    private String matchCharset(String value, Pattern pattern) {
        Matcher matcher = pattern.matcher(value);
        if (!matcher.find()) {
            return null;
        }
        return matcher.group(1);
    }

    private String decodeStrict(byte[] bytes, Charset charset) throws CharacterCodingException {
        CharsetDecoder decoder = charset.newDecoder()
                .onMalformedInput(CodingErrorAction.REPORT)
                .onUnmappableCharacter(CodingErrorAction.REPORT);
        CharBuffer decoded = decoder.decode(ByteBuffer.wrap(bytes));
        return decoded.toString();
    }

}
