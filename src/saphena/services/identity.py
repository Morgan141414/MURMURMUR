def _checksum(iin: str, weights: tuple[int, ...]) -> int:
    return sum(int(digit) * weight for digit, weight in zip(iin, weights, strict=False)) % 11


def is_valid_iin(iin: str) -> bool:
    if len(iin) != 12 or not iin.isdigit():
        return False

    control_digit = int(iin[-1])
    base_weights = (1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11)
    checksum = _checksum(iin, base_weights)
    if checksum == 10:
        fallback_weights = (3, 4, 5, 6, 7, 8, 9, 10, 11, 1, 2)
        checksum = _checksum(iin, fallback_weights)
    if checksum == 10:
        return False
    return checksum == control_digit

