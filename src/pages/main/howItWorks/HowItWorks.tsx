import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { IoAddCircleOutline, IoDocumentTextOutline, IoChatbubblesOutline, IoArrowForwardOutline, IoPlayOutline } from 'react-icons/io5';
import { Add } from '../../../shared/ui/Button/Header/Add/Add.tsx';
import { InfoModal } from '../../../shared/ui/Modal/InfoModal';
import { StepsNotice } from '../../../shared/ui/StepsNotice';
import stepsNoticeStyles from '../../../shared/ui/StepsNotice/StepsNotice.module.scss';
import styles from './HowItWorks.module.scss';

/**
 * Third card alongside the client/master Performers row — a teaser + a modal explainer
 * for "how to post a listing", illustrated with the same StepsNotice icon-badge system
 * used for the Instagram professional-account notice (see InstagramProfessionalNotice).
 */
export function HowItWorks() {
    const { t } = useTranslation(['components']);
    const [isOpen, setIsOpen] = useState(false);

    return (
        <>
            <div className={styles.card}>
                <div className={styles.info}>
                    <h2 className={styles.title}>{t('pages.main.howItWorksTitle')}</h2>
                    <p className={styles.subtitle}>{t('pages.main.howItWorksSubtitle')}</p>
                    <Add
                        text={t('pages.main.howItWorksButton')}
                        icon={<IoPlayOutline />}
                        onClick={() => setIsOpen(true)}
                    />
                </div>

                <div className={`${stepsNoticeStyles.badge} ${styles.illustration}`}>
                    <span><IoAddCircleOutline /></span>
                    <IoArrowForwardOutline className={stepsNoticeStyles.badgeConnector} />
                    <span><IoDocumentTextOutline /></span>
                    <IoArrowForwardOutline className={stepsNoticeStyles.badgeConnector} />
                    <span><IoChatbubblesOutline /></span>
                </div>
            </div>

            <InfoModal isOpen={isOpen} onClose={() => setIsOpen(false)}>
                <StepsNotice
                    badgeIcons={[
                        <IoAddCircleOutline />,
                        <IoArrowForwardOutline className={stepsNoticeStyles.badgeConnector} />,
                        <IoDocumentTextOutline />,
                        <IoArrowForwardOutline className={stepsNoticeStyles.badgeConnector} />,
                        <IoChatbubblesOutline />,
                    ]}
                    title={t('howToPost.title')}
                    text={t('howToPost.text')}
                    steps={[
                        { icon: <IoAddCircleOutline />, text: t('howToPost.step1') },
                        { icon: <IoDocumentTextOutline />, text: t('howToPost.step2') },
                        { icon: <IoDocumentTextOutline />, text: t('howToPost.step3') },
                        { icon: <IoChatbubblesOutline />, text: t('howToPost.step4') },
                    ]}
                >
                    <button type="button" className={styles.modalButton} onClick={() => setIsOpen(false)}>
                        {t('howToPost.continue')}
                    </button>
                </StepsNotice>
            </InfoModal>
        </>
    );
}

export default HowItWorks;
