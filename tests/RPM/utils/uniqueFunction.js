import { expect } from '@playwright/test';
import { searchNamedTable } from './tableAssertions';
import { expectAndDismissToast } from './toastAssertions';

async function checkTitle(page, expectedTitle) {
    const title = page.getByRole('heading', {
        name: expectedTitle,
        exact: true,
    });

    await expect(title).toBeVisible();
}

async function searchConstraint(page, constraint) {
    return searchNamedTable(page, {
        tableId: 'constraints',
        listPath: '/rpm/constraints/GetConstraints',
        name: constraint,
    });
}

async function deleteConstraint(page, constraint, allowMissing = false, verifyCopy = false) {
    const { row } = await searchConstraint(page, constraint);

    if (allowMissing && await row.count() === 0) {
        return false;
    }

    await expect(row).toHaveCount(1);
    await row.locator('[id^=delete-]').click();

    const modal = page.locator('.modal:visible').filter({ hasText: constraint });
    await expect(modal).toHaveCount(1);
    await expect(modal).toBeVisible();

    if (verifyCopy) {
        await expect(modal.locator('.modal-header')).toHaveText('Delete Constraint');
        const escapedConstraint = constraint.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // RC currently omits the closing quote. Keep the complete confirmation
        // and exact resource name mandatory while accepting either spelling.
        await expect(modal.locator('.modal-body')).toHaveText(
            new RegExp(`^Are you sure you wish to delete Constraint "${escapedConstraint}"?\\?$`)
        );
    }

    // Click the confirm button in the modal footer
    await modal.locator('.modal-footer button.variant-filled').click();
    await expect(modal).toBeHidden();

    return true;
}
async function checkAndCloseToast(page, constraint) {
    await expectAndDismissToast(page, `Constraint "${constraint}" deleted.`);

    // Verify the persisted end state instead of trusting the notification alone.
    await page.reload({ waitUntil: 'domcontentloaded' });
    const { row, noRows } = await searchConstraint(page, constraint);
    await expect(row).toHaveCount(0);
    await expect(noRows).toBeVisible();
}


module.exports = {
    checkTitle,
    deleteConstraint,
    checkAndCloseToast,
};
