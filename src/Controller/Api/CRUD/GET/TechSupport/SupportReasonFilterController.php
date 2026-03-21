<?php

namespace App\Controller\Api\CRUD\GET\TechSupport;

use App\Repository\Appeal\AppealReasonRepository;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;

class SupportReasonFilterController extends AbstractController
{
    public function __construct(private readonly AppealReasonRepository $appealReasonRepository) {}

    public function __invoke(): JsonResponse
    {
        $reasons = $this->appealReasonRepository->createQueryBuilder('r')
            ->where('r.applicableTo IN (:types)')
            ->setParameter('types', ['support', 'overall'])
            ->getQuery()
            ->getResult();

        $result = [];
        foreach ($reasons as $reason) {
            $result[] = [
                'id'           => $reason->getId(),
                'support_code' => $reason->getCode(),
                'support_human' => $reason->getTitle(),
            ];
        }

        return $this->json($result);
    }
}
