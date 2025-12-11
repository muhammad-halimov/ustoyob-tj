<?php

namespace App\Service\Extra;

use Doctrine\ORM\EntityManagerInterface;
use InvalidArgumentException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

readonly class ExtractIriService
{
    public function __construct(private EntityManagerInterface $em){}

    /**
     * @param string $iriOrId
     * @param class-string|null $entityClass
     * @param string $routeName
     * @return object
     */
    public function extract(string $iriOrId, ?string $entityClass, string $routeName): object
    {
        if ($entityClass === null) throw new InvalidArgumentException('Entity class cannot be null');

        preg_match("#/api/$routeName/(\d+)#", $iriOrId, $matches);
        $id = $matches[1] ?? $iriOrId;

        $entity = $this->em->getRepository($entityClass)->find($id);

        if (!$entity) throw new NotFoundHttpException("$entityClass #$id not found");

        return $entity;
    }
}
