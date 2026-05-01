class CancelRequest:
    def __init__(self):
        self.should_cancel = False

    def cancel(self):
        self.should_cancel = True

    def reset(self):
        self.should_cancel = False


class Settings:
    def __init__(self):
        self.show_preview = True
        self.blank_on_error = False


def try_parse_int(value, default=0):
    try:
        return int(value)
    except ValueError:
        return default
