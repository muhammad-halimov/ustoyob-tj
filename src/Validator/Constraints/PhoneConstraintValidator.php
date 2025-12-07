<?php

namespace App\Validator\Constraints;

use Symfony\Component\Validator\Constraint;
use Symfony\Component\Validator\ConstraintValidator;
use Symfony\Component\Validator\Exception\UnexpectedTypeException;

class PhoneConstraintValidator extends ConstraintValidator
{
    public function validate(mixed $value, Constraint $constraint): void
    {
        if (!$constraint instanceof PhoneConstraint) {
            throw new UnexpectedTypeException($constraint, PhoneConstraint::class);
        }

        if (null === $value || '' === $value) {
            return;
        }

        $cleaned = preg_replace('/[^\d+]/', '', $value);

        if (!preg_match('/^(\+992)?[0-9]{9}$/', $cleaned)) {
            $this->context
                ->buildViolation($constraint->getMessage())
                ->setParameter('{{ value }}', $value)
                ->addViolation();
        }
    }
}
