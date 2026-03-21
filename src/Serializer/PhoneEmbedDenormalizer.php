<?php

namespace App\Serializer;

use App\Entity\User\Phone;
use Doctrine\ORM\EntityManagerInterface;
use Doctrine\ORM\Exception\ORMException;
use Doctrine\ORM\OptimisticLockException;
use Symfony\Component\Serializer\Exception\ExceptionInterface;
use Symfony\Component\Serializer\Normalizer\DenormalizerAwareInterface;
use Symfony\Component\Serializer\Normalizer\DenormalizerAwareTrait;
use Symfony\Component\Serializer\Normalizer\DenormalizerInterface;

class PhoneEmbedDenormalizer implements DenormalizerInterface, DenormalizerAwareInterface
{
    use DenormalizerAwareTrait;

    private const string ALREADY_CALLED = 'PHONE_EMBED_DENORMALIZER_CALLED';

    public function __construct(private readonly EntityManagerInterface $em) {}

    public function supportsDenormalization(mixed $data, string $type, ?string $format = null, array $context = []): bool
    {
        return $type === Phone::class
            && is_array($data)
            && isset($data['id'])
            && !($context[self::ALREADY_CALLED] ?? false);
    }

    /**
     * @throws ExceptionInterface
     * @throws OptimisticLockException
     * @throws ORMException
     */
    public function denormalize(mixed $data, string $type, ?string $format = null, array $context = []): mixed
    {
        $context[self::ALREADY_CALLED] = true;

        $phone = $this->em->find(Phone::class, (int) $data['id']);

        if (!$phone) {
            unset($data['id']);
            return $this->denormalizer->denormalize($data, $type, $format, $context);
        }

        if (isset($data['phone'])) {
            $phone->setPhone($data['phone']);
        }
        if (isset($data['main'])) {
            $phone->setMain($data['main']);
        }

        return $phone;
    }

    public function getSupportedTypes(?string $format): array
    {
        return [Phone::class => false];
    }
}
