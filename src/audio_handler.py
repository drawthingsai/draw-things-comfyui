import torch
import numpy as np
from fpzip import decompress


def convert_response_audio(response_audio, version: str):
    raw = b"".join(response_audio)[68:]  # skip header

    try:
        if raw.startswith(b"fpy"):
            decompressed = decompress(raw)
            if decompressed is not None:
                raw = decompressed
    except Exception as e:
        pass

    data = np.frombuffer(raw, dtype=np.float32)

    # Split planar channels
    half = data.shape[0] // 2
    left = data[:half]
    right = data[half:]

    # Stack into [C, T]
    arr = np.stack([left, right], axis=0)

    # Add batch dim → [B, C, T]
    waveform = torch.from_numpy(arr).unsqueeze(0)

    sample_rate = 48000 if version in ["ltx2_3", "ltx2.3"] else 24000

    return dict(waveform=waveform, sample_rate=sample_rate)
