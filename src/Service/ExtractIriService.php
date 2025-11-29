<?php

namespace App\Service;

use Doctrine\ORM\EntityManagerInterface;

readonly class ExtractIriService
{
    public function __construct(private EntityManagerInterface $em){}

    public function extract(string $iriOrId, string $entityClass, string $routeName): object
    {
        return $this->em->getRepository($entityClass)->find(
            preg_match(
                "#/api/$routeName/(\d+)#",
                $iriOrId,
                $matches
            ) ? $matches[1] : $iriOrId
        );
    }
}
