import {Composition, registerRoot} from 'remotion';
import {SpecsPromo} from './SpecsPromo';
import '@fontsource/poppins/400.css';
import '@fontsource/poppins/600.css';
import '@fontsource/poppins/700.css';
import '@fontsource/poppins/800.css';

registerRoot(() => <Composition id="SpecsPromo" component={SpecsPromo} width={1920} height={1080} fps={30} durationInFrames={1350} defaultProps={{signupUrl: 'specs-portal.org/signup'}} />);
