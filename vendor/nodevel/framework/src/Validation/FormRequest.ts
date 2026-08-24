'use strict';

const { Validator, ValidationException } = require('./Validator');

export {};

/**
 * Form requests — the equivalent of `Illuminate\Foundation\Http\FormRequest`.
 *
 *   class StorePostRequest extends FormRequest {
 *       static rules() {
 *           return { title: 'required|string|max:255', body: 'required' };
 *       }
 *       static authorize(request) { return true; }
 *   }
 */
class FormRequest {
    /** Validation rules. */
    static rules(): Record<string, string | string[]> {
        return {};
    }

    /** Authorization logic — return false to abort with 403. */
    static authorize(request?: any): boolean {
        return true;
    }

    static messages(): Record<string, string> {
        return {};
    }

    /**
     * Validate a request against this form request's rules.
     * Returns the validated subset of input.
     */
    static async validateRequest(app: any, request: any): Promise<Record<string, any>> {
        if (!(await this.authorize(request))) {
            const error: Error & { status?: number } = new Error('This action is unauthorized.');
            error.status = 403;
            throw error;
        }

        const data = request.all();
        const validator = Validator.make(data, this.rules(), this.messages());
        request.errors = validator;

        const errors = await validator.validateAsync(app);
        if (Object.keys(errors).length > 0) {
            throw new ValidationException(errors);
        }

        return validator.validated();
    }
}

module.exports = FormRequest;
