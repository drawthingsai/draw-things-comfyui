import test from '@playwright/test';

test("prompts colors", async ({ page }) => {
    // load prompt workflow

    // assert prompt node is uncolored

    // connect to positive, assert green

    // disconnect, assert uncolored

    // connect to negative, assert red

    // connect to positive (and negative), assert purple

    // disconnect negative, assert green

    // disconnect positive, assert uncolored
})

test("prompts colors option", async ({ page }) => {
    // load prompt workflow

    // assert option is enabled

    // connect positive, assert green

    // turn option off

    // disconnect, assert green

    // connect to negative, assert green

    // enable optioon

    // assert uncolored
});

test("textual inversion insertion/removal", async ({ page }) => {
    // load prompt workflow

    // assert TIs are listed

    // select a TI, assert prompt text is updated

    // insert another TI, assert prompt text is updated

    // remove a TI, assert prompt text is updated
});

test("textual inversion options", async ({ page }) => {
    // load prompt workflow

    // assert TIs are listed, and none are checked

    // update prompt text manually, including a TI keywork

    // assert TI is checked

    // change sampler model to sdxl version

    // assert sd TIs are disabled

    // assert that the original TI is NOT disabled, and still checked

    // select the original TI, assert prompt text is updated

    // assert original TI is now unchecked and disabled
});
