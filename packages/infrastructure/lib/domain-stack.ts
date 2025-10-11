import { Certificate, CertificateValidation } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, ZoneDelegationRecord } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

export class DomainStack extends Construct{
    private CRUX_DOMAIN = "harimp.com";
    private HOST_DOMAIN = `choir.${this.CRUX_DOMAIN}`;
    private HOSTED_ZONE_ID = "Z01404943TDYJCPX31X6L";

    public hostedZone: HostedZone;
    public certificate: Certificate;

    constructor(scope: Construct, id: string) {
        super(scope, id);

        // Hosted Zone for parent domain
        const parentHostedZone = HostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
            zoneName: this.CRUX_DOMAIN,
            hostedZoneId: this.HOSTED_ZONE_ID,
        });

        this.hostedZone = new HostedZone(this, 'ChoirSeatingManagerHostedZone', {
            zoneName: this.HOST_DOMAIN,
        });

        const delegationRecord = new ZoneDelegationRecord(this, 'DelegationRecord', {
            zone: parentHostedZone,
            nameServers: this.hostedZone.hostedZoneNameServers!,
        });

        // ACM Certificate for the domain
        this.certificate = new Certificate(this, 'ChoirSeatingManagerCertificate', {
            domainName: this.HOST_DOMAIN,
            validation: CertificateValidation.fromDns(this.hostedZone),
        });
    }
}