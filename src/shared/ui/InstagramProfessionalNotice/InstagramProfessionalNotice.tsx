import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { IoLogoInstagram, IoMenuOutline, IoSettingsOutline, IoSwapHorizontalOutline, IoBriefcaseOutline } from 'react-icons/io5';
import { StepsNotice } from '../StepsNotice';
import stepsNoticeStyles from '../StepsNotice/StepsNotice.module.scss';

interface InstagramProfessionalNoticeProps {
    /** Action buttons rendered below the steps — each caller supplies its own (Auth modal vs a standalone page use different button styles). */
    children?: ReactNode;
    className?: string;
}

/**
 * Explains why Instagram sign-in requires a Professional (Business/Creator) account, with
 * the steps to switch. Instagram closed the Basic Display API (04.12.2024) — Personal
 * accounts have no official way to authenticate via Instagram API with Instagram Login,
 * there's no code workaround. Shown in two places:
 *  - Auth.tsx (AuthModalState.INSTAGRAM_NOTICE) — pre-emptively, before starting the flow.
 *  - OAuthCallbackPage.tsx — reactively, when the backend actually returns
 *    AppMessages::OAUTH_INSTAGRAM_PROFESSIONAL_REQUIRED (Meta rejected a Personal account
 *    that made it all the way through consent).
 *
 * Thin content wrapper over the generic StepsNotice — see also Main.tsx's "how to post
 * a listing" explainer, which reuses the same visual pattern.
 */
export function InstagramProfessionalNotice({ children, className }: InstagramProfessionalNoticeProps) {
    const { t } = useTranslation(['components']);

    return (
        <StepsNotice
            className={className}
            badgeIcons={[
                <IoLogoInstagram />,
                <IoSwapHorizontalOutline className={stepsNoticeStyles.badgeConnector} />,
                <IoBriefcaseOutline />,
            ]}
            title={t('auth.instagramNoticeTitle')}
            text={t('auth.instagramNoticeText')}
            steps={[
                { icon: <IoLogoInstagram />, text: t('auth.instagramNoticeStep1') },
                { icon: <IoMenuOutline />, text: t('auth.instagramNoticeStep2') },
                { icon: <IoSettingsOutline />, text: t('auth.instagramNoticeStep3') },
                { icon: <IoBriefcaseOutline />, text: t('auth.instagramNoticeStep4') },
            ]}
        >
            {children}
        </StepsNotice>
    );
}

export default InstagramProfessionalNotice;
